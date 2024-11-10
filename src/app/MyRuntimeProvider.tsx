import { useState, ReactNode } from "react";
import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
  ToolCallContentPart,
  TextContentPart,
  useExternalMessageConverter,
} from "@assistant-ui/react";
import { RemoteRunnable } from '@langchain/core/runnables/remote';
import { BaseMessage } from "@langchain/core/dist/messages/base";

type MyMessage = {
  role: "assistant" | "user" | "system";
  content: string | ( ToolCallContentPart)[];
}
 
const convertMessage = (message: MyMessage): ThreadMessageLike => {

  let content = "";
  if (typeof message.content === "string") {
    content = message.content
  } else if (message.content[0].type === "tool-call") {
    return {
      role: message.role,
      content: message.content
    }
  }

  return {
    role: message.role,
    content: [{ type: "text", text: content }],
  };
};
 
export default function MyRuntimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<MyMessage[]>([]);
 
  const onNew = async (message: AppendMessage) => {
    if (message.content[0]?.type !== "text")
      throw new Error("Only text messages are supported");
 
    const input = message.content[0].text;
    setMessages((currentConversation) => [
      ...currentConversation,
      { role: "user", content: input },
    ]);
 
    setIsRunning(true);
    try {
        const remoteChain = new RemoteRunnable({
            url: 'http://localhost:8000/chat/',
          });
    
          const stream = await remoteChain.stream(
            {
              input: input,
              chat_history: messages
            },
            {
              // version: 'v2',
              configurable: {
                "thread_id": 42
              }
            },
          );
    
          setMessages((currentConversation) => [
            ...currentConversation,
            { role: "assistant", content: "" },
          ]);
          
          let assistantMessageContent = "";
          for await (const chunk of stream) {
            assistantMessageContent += (chunk as any)['content']

            //modify last message
            setMessages((currentConversation) => [
              ...currentConversation.slice(0, -1),
              { role: "assistant", content: assistantMessageContent }, // Set the entire message once
            ]);
          }       
      } catch (error) {
        console.error(error);
      } finally {
        setIsRunning(false);
      }
  };
 
  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage,
    onNew,
  });
 
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
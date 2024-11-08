import { useState, ReactNode } from "react";
import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { RemoteRunnable } from '@langchain/core/runnables/remote';

type MyMessage = {
    role: "user" | "assistant";
    content: string;
}
 
const convertMessage = (message: MyMessage): ThreadMessageLike => {
  return {
    role: message.role,
    content: [{ type: "text", text: message.content }],
  };
};
 
export default function MyRuntimeProviderLSLG({
  children,
  chatUUID
}: Readonly<{
  children: ReactNode;
  chatUUID: string
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
            url: 'http://localhost:8000/lg/',
          });
    
          const stream = await remoteChain.streamEvents(
            {
              input: input,
              chat_history: messages
            },
            {
              version: 'v2',
              configurable: {
                "thread_id": chatUUID
              }
            },
          );
    

          setMessages((currentConversation) => [
            ...currentConversation,
            { role: "assistant", content: "" },
          ]);

          let assistantMessageContent = "";
          for await (const chunk of stream) {
            if (chunk.event === "on_chat_model_stream") {
              const newContent = (chunk.data.chunk as any)['content'];
              assistantMessageContent += newContent;  // Append the content in one variable

              //modify last message
              setMessages((currentConversation) => [
                ...currentConversation.slice(0, -1),
                { role: "assistant", content: assistantMessageContent }, // Set the entire message once
              ]);
              }
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
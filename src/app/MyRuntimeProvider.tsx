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
            // {
            //   version: 'v2',
            // },
          );
    
          const assistantMessage: MyMessage = {
            role: "assistant",
            content: "",
          };

          for await (const chunk of stream) {
            assistantMessage.content += (chunk as any)['content']
          }
        
          setMessages((currentConversation) => [
            ...currentConversation,
            assistantMessage,
          ]);
       
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
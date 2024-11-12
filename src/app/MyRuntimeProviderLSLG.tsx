import { useState, ReactNode } from "react";
import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
  ToolCallContentPart,
  TextContentPart,
  UIContentPart,
} from "@assistant-ui/react";
import { RemoteRunnable } from '@langchain/core/runnables/remote';

type MyMessage = {
    role: "user" | "assistant";
    content: string | ( ToolCallContentPart | TextContentPart | UIContentPart)[];
    tool?: any
}
 
const convertMessage = (message: MyMessage): ThreadMessageLike => {
  let textContent = "";
  
  if (typeof message.content === "string") {
    textContent = message.content;
  } else if (Array.isArray(message.content)) {
    return {
      role: message.role,
      content: [...message.content]
    }
  }

  return {
    role: message.role,
    content: [{ type: "text", text: textContent,}],
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
  const example: any[] = [];
  // const example: any[] = [{ role: "assistant", content: [{type: "text", text: "hello"},{ type: "tool-call", toolName: "web_search", toolCallId: "web_search", args: { key: "value"}, argsText: "" }]}];
  const [messages, setMessages] = useState<MyMessage[]>(example);
 
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
          let tool: any = null;
          // let i = 0;
          for await (const chunk of stream) {
            // console.log(`@chunk ${i++}: `, chunk);

            if (chunk.name === "_convert_message_langgraph") {
              setMessages((currentConversation) => [
                ...currentConversation.slice(0, -1),
                { role: "assistant", content: "thinking..." },
              ]);
            }

            if (chunk.event === "on_tool_end") {
              tool = { type: "tool-call", toolName: "web_search", toolCallId: "web_search", args: { query: chunk.data.output.content}, argsText: "" };
            }

            if (chunk.event === "on_chat_model_stream") {
              const newContent = (chunk.data.chunk as any)['content'];
              assistantMessageContent += newContent;  // Append the content in one variable

              // modify last message
              setMessages((currentConversation) => {
                let content: any = assistantMessageContent;

                if (tool) {
                  content = [{ type: "text", text: content }, { ...tool }]
                }
                
                return[
                ...currentConversation.slice(0, -1),
                { role: "assistant", content: content }, // Set the entire message once
              ]});
              }
          }
          tool = null;
       
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
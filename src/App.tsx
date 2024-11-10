import React, { FC, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import MyRuntimeProvider from './app/MyRuntimeProvider';
import {
  Thread,
  ThreadWelcome,
  Composer,
  type ThreadConfig,
  useEdgeRuntime,
  ThreadWelcomeConfig,
  AssistantMessage,
  BranchPicker,
  AssistantActionBar,
  MessagePrimitive
} from "@assistant-ui/react";
import MyRuntimeProviderLSLG from './app/MyRuntimeProviderLSLG';
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import remarkGfm from 'remark-gfm'
import { v4 as uuidv4 } from 'uuid';
import { makeAssistantToolUI } from "@assistant-ui/react";
 
const MarkdownText = makeMarkdownText({rehypePlugins: [remarkGfm]});

type WebSearchArgs = {
  query: string;
};
 
type WebSearchResult = {
  title: string;
  description: string;
  url: string;
};
 
export const WebSearchToolUI = makeAssistantToolUI<WebSearchArgs, WebSearchResult>({
  toolName: "web_search",
  render: ({ args, status }) => {
    return <p className="bg-blue-100">{args.query}</p>;
  },
});

function App() {
  const [chatUUID, setChatUUID] = useState(uuidv4());

   const MyAssistantMessage: FC = () => {
    return (
      <AssistantMessage.Root>
        <AssistantMessage.Avatar/>
        <AssistantMessage.Content components={{ Text: MarkdownText }}/>
        <BranchPicker />
        <AssistantActionBar />
      </AssistantMessage.Root>
    );
  };
  

  const MyThread: FC<ThreadConfig> = (config) => {
    return (
      <Thread.Root config={config}>
        <Thread.Viewport>
          <ThreadWelcome />
          <Thread.Messages components={{ AssistantMessage: MyAssistantMessage}}/>
          <Thread.FollowupSuggestions />
          <Thread.ViewportFooter>
            <Thread.ScrollToBottom />
            <Composer />
          </Thread.ViewportFooter>
        </Thread.Viewport>
      </Thread.Root>
    );
  };

  const welcome1: ThreadWelcomeConfig = { message: "langserve example" };
  const welcome2: ThreadWelcomeConfig = { message: "langserve with langgraph example", suggestions: [{text: "What is the weather in sf?", prompt: "What is the weather in sf?"}]};
 
  return (
    <div className="h-full">
      <MyRuntimeProvider>
        <Thread assistantMessage={{ components: { Text: MarkdownText } }} welcome={welcome1} tools={[WebSearchToolUI]}/>
        <WebSearchToolUI />
      </MyRuntimeProvider>
      Thread id: {chatUUID}
      <MyRuntimeProviderLSLG chatUUID={chatUUID}>
        <MyThread welcome={welcome2}/>
        <WebSearchToolUI />
      </MyRuntimeProviderLSLG>
    </div>
  );
}

export default App;

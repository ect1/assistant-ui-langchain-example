import React, { FC } from 'react';
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
 
const MarkdownText = makeMarkdownText({rehypePlugins: [remarkGfm]});

function App() {

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
  const welcome2: ThreadWelcomeConfig = { message: "langserve with langgraph example" };
 
  return (
    <div className="h-full">
      <MyRuntimeProvider>
        <MyThread welcome={welcome1}/>
      </MyRuntimeProvider>
      <MyRuntimeProviderLSLG>
        <Thread assistantMessage={{ components: { Text: MarkdownText } }} welcome={welcome2}/>
      </MyRuntimeProviderLSLG>
    </div>
  );
}

export default App;

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
  ThreadWelcomeConfig
} from "@assistant-ui/react";

function App() {
  // const runtime = useEdgeRuntime({
  //   api: "/api/chat",
  // });

  const MyThread: FC<ThreadConfig> = (config) => {
    return (
      <Thread.Root config={config}>
        <Thread.Viewport>
          <ThreadWelcome />
          <Thread.Messages />
          <Thread.FollowupSuggestions />
          <Thread.ViewportFooter>
            <Thread.ScrollToBottom />
            <Composer />
          </Thread.ViewportFooter>
        </Thread.Viewport>
      </Thread.Root>
    );
  };

  const welcome: ThreadWelcomeConfig = { message: "hi" };
 
  return (
    <div className="h-full">
      <MyRuntimeProvider>
        <MyThread welcome={welcome}/>
      </MyRuntimeProvider>
      
    </div>
  );
}

export default App;

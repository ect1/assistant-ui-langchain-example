
from typing import Annotated, Dict, List, Tuple, Literal
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from langserve import APIHandler
from langchain_core.runnables import RunnableLambda, RunnableConfig
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from sse_starlette import EventSourceResponse
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph, MessagesState
from langgraph.prebuilt import ToolNode
from langchain_core.messages import (
    AnyMessage,
)

app = FastAPI(
    title="LangChain Server",
    version="1.0",
    description="Spin up a simple api server using Langchain's Runnable interfaces",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Input(BaseModel):
    input: str
    chat_history: List[Dict[str, str]]
def _convert_message(input: Input):
    print(f"input {input}")

    return input


async def _get_api_handler(request: Request) -> APIHandler:

    convert_message = RunnableLambda(_convert_message)

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", "You are helpful assistant."),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )

    llm = ChatOpenAI(model='gpt-4o-mini', temperature=0, streaming=True)

    chain =  convert_message | prompt | llm

    chain = chain.with_types(input_type=Input)

    return APIHandler(chain, path="/v1")

@app.post("/chat/stream")
async def v3_stream_test(
    request: Request, runnable: Annotated[APIHandler, Depends(_get_api_handler)]
) -> EventSourceResponse:
    """Handle stream request."""
    # The API Handler validates the parts of the request
    # that are used by the runnnable (e.g., input, config fields)
    return await runnable.stream(request)

# langgraph
@tool
def search(query: str):
    """Call to surf the web."""
    # This is a placeholder, but don't tell the LLM that...
    if "sf" in query.lower() or "san francisco" in query.lower():
        return "It's 60 degrees and foggy."
    return "It's 90 degrees and sunny."


tools = [search]

tool_node = ToolNode(tools)

model = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True).bind_tools(tools)

# Define the function that determines whether to continue or not
def should_continue(state: MessagesState) -> Literal["tools", END]: # type: ignore
    messages = state['messages']
    last_message = messages[-1]
    # If the LLM makes a tool call, then we route to the "tools" node
    if last_message.tool_calls:
        return "tools"
    # Otherwise, we stop (reply to the user)
    return END


# Define the function that calls the model
async def call_model(state: MessagesState, config: RunnableConfig):
    messages = state['messages']
    response = await model.ainvoke(messages, config)
    # We return a list, because this will get added to the existing list
    return {"messages": [response]}


# Define a new graph
workflow = StateGraph(MessagesState)

# Define the two nodes we will cycle between
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

# Set the entrypoint as `agent`
# This means that this node is the first one called
workflow.add_edge(START, "agent")

# We now add a conditional edge
workflow.add_conditional_edges(
    # First, we define the start node. We use `agent`.
    # This means these are the edges taken after the `agent` node is called.
    "agent",
    # Next, we pass in the function that will determine which node is called next.
    should_continue,
)

# We now add a normal edge from `tools` to `agent`.
# This means that after `tools` is called, `agent` node is called next.
workflow.add_edge("tools", 'agent')

# Initialize memory to persist state between graph runs
checkpointer = MemorySaver()

# Finally, we compile it!
# This compiles it into a LangChain Runnable,
# meaning you can use it as you would any other runnable.
# Note that we're (optionally) passing the memory when compiling the graph
graph = workflow.compile(checkpointer=checkpointer)

class Message(BaseModel):
    chat_history: List[Dict[str, str]] = Field(
        ...,
        extra={"widget": {"type": "chat", "input": "question"}},
    )
    input: str

def _convert_message_langgraph(msg: Message):

    return {"messages": [HumanMessage(content=msg["input"])]}


async def _get_api_handler_lg(request: Request) -> APIHandler:

    t = RunnableLambda(_convert_message_langgraph)

    rag_chain =  t | graph
  
    chain = rag_chain.with_types(input_type=Message)

    return APIHandler(chain, path="/v1")

@app.post("/lg/stream_events")
async def v3_stream_test(
    request: Request, runnable: Annotated[APIHandler, Depends(_get_api_handler_lg)]
) -> EventSourceResponse:
    """Handle stream request."""
    # The API Handler validates the parts of the request
    # that are used by the runnnable (e.g., input, config fields)
    return await runnable.astream_events(request)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend:app", host="localhost", port=8000, reload=True)
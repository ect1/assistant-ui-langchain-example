
from typing import Annotated, Dict, List
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from langserve import APIHandler
from langchain_core.runnables import RunnableLambda
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from sse_starlette import EventSourceResponse

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

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend:app", host="localhost", port=8000, reload=True)
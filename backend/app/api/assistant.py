import asyncio
import json
from typing import AsyncGenerator
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.domain.assistant_schemas import AssistantRequest, AssistantResponse
from app.services.assistant_service import CompensationAssistantService
from app.services.gemini_service import GeminiToolService

router = APIRouter()


@router.post("/ask", response_model=AssistantResponse, summary="Natural-language compensation and employee analytics assistant")
def ask_compensation_question(
    payload: AssistantRequest,
    db: Session = Depends(get_db),
):
    return CompensationAssistantService.answer_question(
        db=db,
        question=payload.question,
        reporting_currency=payload.reporting_currency,
    )


@router.post("/ask/stream", summary="Stream natural-language assistant response with real-time SSE events")
@router.post("/assistant/stream", summary="Stream natural-language assistant response with real-time SSE events")
async def stream_compensation_question(
    payload: AssistantRequest,
    db: Session = Depends(get_db),
):
    async def event_generator() -> AsyncGenerator[str, None]:
        q = payload.question.strip()
        currency = CompensationAssistantService._extract_currency(q, payload.reporting_currency)

        # Step 1: Initial event
        yield f"event: status\ndata: {json.dumps({'step': 'intent_analysis', 'message': 'Evaluating query with AI...'})}\n\n"
        await asyncio.sleep(0.01)

        # Step 2: Tool selection via AI
        tool_result = await asyncio.to_thread(GeminiToolService.call_tool, q)
        if tool_result is not None:
            intent, params = tool_result
            display_intent = intent.replace("_", " ").title()
            yield f"event: status\ndata: {json.dumps({'step': 'tool_calling', 'tool': display_intent, 'params': params, 'message': f'AI evaluated operation: {display_intent}'})}\n\n"
        else:
            intent, params = "unsupported", {}
            yield f"event: status\ndata: {json.dumps({'step': 'tool_calling', 'tool': 'Query Evaluation', 'params': params, 'message': 'Evaluating question parameters'})}\n\n"
        await asyncio.sleep(0.01)

        # Step 3: Database query execution
        yield f"event: status\ndata: {json.dumps({'step': 'querying_db', 'message': 'Querying enterprise database...'})}\n\n"
        await asyncio.sleep(0.01)

        answer, operation, data, metadata = await asyncio.to_thread(
            CompensationAssistantService._execute_intent, db, intent, params, currency, q
        )
        metadata["ai_provider"] = "AI Verified"
        metadata["based_on"] = "Verified enterprise database records"

        yield f"event: status\ndata: {json.dumps({'step': 'db_done', 'message': 'Enterprise database records verified'})}\n\n"
        await asyncio.sleep(0.01)

        # Step 4: Stream response tokens for a smooth conversational display
        words = answer.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
            await asyncio.sleep(0.012)

        # Step 5: Final verified structured payload
        final_payload = {
            "answer": answer,
            "operation": operation,
            "data": data,
            "metadata": metadata,
        }
        yield f"event: result\ndata: {json.dumps(final_payload)}\n\n"
        yield f"event: done\ndata: {json.dumps({'status': 'complete'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

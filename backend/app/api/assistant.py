from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.domain.assistant_schemas import AssistantRequest, AssistantResponse
from app.services.assistant_service import CompensationAssistantService

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

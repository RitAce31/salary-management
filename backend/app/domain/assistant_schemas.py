from typing import Any, Dict
from pydantic import BaseModel, Field, field_validator


class AssistantRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    reporting_currency: str = Field("USD", max_length=5)

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Question cannot be empty or whitespace")
        return cleaned


class AssistantResponse(BaseModel):
    answer: str
    operation: str
    data: Dict[str, Any]
    metadata: Dict[str, Any]

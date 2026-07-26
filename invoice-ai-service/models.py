"""
Pydantic Models für Invoice AI Service

Validiert die Ollama-Response und stellt sicher,
dass nur gültige Werte durchkommen.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class InvoicePosition(BaseModel):
    """Rechnungsposition mit Validierung"""
    
    articleNumber: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = Field(None, ge=0)  # >= 0
    unit: Optional[str] = None
    packagingUnit: Optional[int] = Field(None, ge=0)  # >= 0
    unitPrice: Optional[float] = Field(None, ge=0)  # >= 0
    lineTotal: Optional[float] = Field(None, ge=0)  # >= 0
    taxRate: Optional[float] = Field(None, ge=0, le=100)  # 0-100%
    confidence: Optional[float] = Field(None, ge=0, le=1)  # 0-1
    
    @field_validator('quantity', 'unitPrice', 'lineTotal', mode='before')
    @classmethod
    def reject_negative(cls, v):
        """Negative Werte werden zu null"""
        if v is not None and v < 0:
            return None
        return v
    
    def is_empty(self) -> bool:
        """Position ist komplett leer wenn alle Felder null sind"""
        return all([
            self.articleNumber is None,
            self.description is None,
            self.quantity is None,
            self.unit is None,
            self.packagingUnit is None,
            self.unitPrice is None,
            self.lineTotal is None,
            self.taxRate is None
        ])


class InvoiceResult(BaseModel):
    """Gesamtes Rechnungs-Ergebnis"""
    
    supplier: Optional[str] = None
    invoiceNumber: Optional[str] = None
    invoiceDate: Optional[str] = None
    positions: List[InvoicePosition] = Field(default_factory=list)
    pagesProcessed: int = Field(0, ge=0)
    processingTimeMs: int = Field(0, ge=0)
    model: str = "qwen2.5vl:3b"
    
    @field_validator('positions')
    @classmethod
    def remove_empty_positions(cls, positions: List[InvoicePosition]) -> List[InvoicePosition]:
        """Komplett leere Positionen entfernen"""
        return [pos for pos in positions if not pos.is_empty()]


class OllamaInvoiceData(BaseModel):
    """Von Ollama erwartetes JSON-Format"""
    
    supplier: Optional[str] = None
    invoiceNumber: Optional[str] = None
    invoiceDate: Optional[str] = None
    positions: List[InvoicePosition] = Field(default_factory=list)

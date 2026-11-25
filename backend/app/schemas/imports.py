from pydantic import BaseModel


class RowErrorDetail(BaseModel):
    """Details of any invalid or duplicate row in the uploaded Excel sheet."""
    row_number: int
    part_number: str | None = None
    reason: str


class ImportSummaryResponse(BaseModel):
    """Summary of the bulk catalog import operation."""
    filename: str
    total_rows_processed: int
    imported_count: int
    skipped_count: int
    errors: list[RowErrorDetail] = []

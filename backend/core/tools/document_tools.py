from pathlib import Path

from docx import Document
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
)
from reportlab.lib.styles import getSampleStyleSheet
from pptx import Presentation
from openpyxl import Workbook

from langchain_core.tools import tool


OUTPUT_DIR = Path("./data/outputs")


def prepare_output(filename: str) -> Path:

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    return OUTPUT_DIR / filename


@tool
def create_docx(filename: str, title: str, content: str) -> str:
    """Create a DOCX document."""

    try:
        path = prepare_output(filename)

        document = Document()

        document.add_heading(title, level=1)

        for paragraph in content.split("\n"):
            if paragraph.strip():
                document.add_paragraph(paragraph.strip())

        document.save(path)

        return f"Document created successfully: {path}"

    except Exception as e:
        return f"DOCX creation failed: {e}"


@tool
def create_pdf(filename: str, title: str, content: str) -> str:
    """Create a PDF document."""

    try:
        path = prepare_output(filename)

        styles = getSampleStyleSheet()

        document = SimpleDocTemplate(str(path), pagesize=A4)

        story = []

        story.append(Paragraph(title, styles["Title"]))

        story.append(Spacer(1, 20))

        for paragraph in content.split("\n"):
            if paragraph.strip():
                story.append(Paragraph(paragraph.strip(), styles["BodyText"]))

                story.append(Spacer(1, 10))

        document.build(story)

        return f"PDF created successfully: {path}"

    except Exception as e:
        return f"PDF creation failed: {e}"


@tool
def create_pptx(filename: str, title: str, content: str) -> str:
    """Create a PowerPoint presentation."""

    try:
        path = prepare_output(filename)

        presentation = Presentation()

        title_slide = presentation.slides.add_slide(presentation.slide_layouts[0])

        title_slide.shapes.title.text = title

        lines = [line.strip() for line in content.split("\n") if line.strip()]

        chunk_size = 5

        for i in range(0, len(lines), chunk_size):
            slide = presentation.slides.add_slide(presentation.slide_layouts[1])

            slide.shapes.title.text = f"{title} - {i // chunk_size + 1}"

            text_frame = slide.placeholders[1].text_frame

            text_frame.clear()

            for line in lines[i : i + chunk_size]:
                paragraph = text_frame.paragraphs[0]

                if paragraph.text:
                    paragraph = text_frame.add_paragraph()

                paragraph.text = line
                paragraph.level = 0

        presentation.save(path)

        return f"PPTX created successfully: {path}"

    except Exception as e:
        return f"PPTX creation failed: {e}"


@tool
def create_xlsx(filename: str, title: str, content: str) -> str:
    """Create an Excel XLSX workbook."""

    try:
        path = prepare_output(filename)

        workbook = Workbook()

        sheet = workbook.active

        sheet.title = "Report"

        sheet["A1"] = title

        lines = [line.strip() for line in content.split("\n") if line.strip()]

        for row_number, line in enumerate(lines, start=3):
            sheet.cell(row=row_number, column=1, value=line)

        sheet.column_dimensions["A"].width = 100

        workbook.save(path)

        return f"XLSX created successfully: {path}"

    except Exception as e:
        return f"XLSX creation failed: {e}"

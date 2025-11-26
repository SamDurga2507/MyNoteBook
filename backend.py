from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://noteuser:notepass@db:5432/notedb")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(title="Notepad App")
templates = Jinja2Templates(directory="templates")

# Routes
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    db = SessionLocal()
    notes = db.query(Note).order_by(Note.updated_at.desc()).all()
    db.close()
    return templates.TemplateResponse("index.html", {"request": request, "notes": notes})

@app.get("/note/new", response_class=HTMLResponse)
async def new_note(request: Request):
    return templates.TemplateResponse("form.html", {"request": request, "note": None})

@app.post("/note/create")
async def create_note(title: str = Form(...), content: str = Form(...)):
    db = SessionLocal()
    note = Note(title=title, content=content)
    db.add(note)
    db.commit()
    db.close()
    return RedirectResponse(url="/", status_code=303)

@app.get("/note/{note_id}", response_class=HTMLResponse)
async def view_note(request: Request, note_id: int):
    db = SessionLocal()
    note = db.query(Note).filter(Note.id == note_id).first()
    db.close()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return templates.TemplateResponse("view.html", {"request": request, "note": note})

@app.get("/note/{note_id}/edit", response_class=HTMLResponse)
async def edit_note(request: Request, note_id: int):
    db = SessionLocal()
    note = db.query(Note).filter(Note.id == note_id).first()
    db.close()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return templates.TemplateResponse("form.html", {"request": request, "note": note})

@app.post("/note/{note_id}/update")
async def update_note(note_id: int, title: str = Form(...), content: str = Form(...)):
    db = SessionLocal()
    note = db.query(Note).filter(Note.id == note_id).first()
    if note:
        note.title = title
        note.content = content
        note.updated_at = datetime.utcnow()
        db.commit()
    db.close()
    return RedirectResponse(url="/", status_code=303)

@app.post("/note/{note_id}/delete")
async def delete_note(note_id: int):
    db = SessionLocal()
    note = db.query(Note).filter(Note.id == note_id).first()
    if note:
        db.delete(note)
        db.commit()
    db.close()
    return RedirectResponse(url="/", status_code=303)

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
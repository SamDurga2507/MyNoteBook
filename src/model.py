from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    tag = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    title_id = db.Column(db.Integer, db.ForeignKey('title.id'), nullable=True)  # Make it nullable

    def __init__(self, content, tag, title_id=None, timestamp=None):
        self.content = content
        self.tag = tag
        self.title_id = title_id
        if timestamp is None:
            timestamp = datetime.utcnow()
        self.timestamp = timestamp

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'tag': self.tag,
            'timestamp': self.timestamp.isoformat(),
            'title_id': self.title_id
        }

class Title(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.relationship('Note', backref='title', lazy=True)
  
    def __init__(self, title, timestamp=None):
        self.title = title
        if timestamp is None:
            timestamp = datetime.utcnow()
        self.timestamp = timestamp
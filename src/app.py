from flask import Flask,render_template,request,jsonify ,make_response
from model import db, Note , Title
from datetime import datetime
import pdfkit 
from sqlalchemy.orm import joinedload

notes=[]


app=Flask(__name__)
app.config['SECRET_KEY']='secret-key'
app.config['SQLALCHEMY_DATABASE_URI']='sqlite:///notes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS']=False


db.init_app(app)

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'Note': Note, 'Title':Title}

with app.app_context():
    # db.drop_all()  # Add this line
    db.create_all()
    print("Database dropped and recreated successfully")

    # Initialize the title if it doesn't exist
    if not Title.query.first():
        default_title = Title(title="Untitled")
        db.session.add(default_title)
        db.session.commit()
@app.route('/')
def home():
    # title = Title.query.first()
    # print("first element ========>",title)
    # if not title:
    #     title = Title(title="Untitled")
    #     db.session.add(title)
    #     db.session.commit()
    # return render_template('dashboard.html', title=title)
    return render_template('dashboard.html')

@app.route('/dashboard')
def dashboard():
   return render_template('dashboard.html')


@app.route('/add_note', methods=['POST'])
def add_note():
    try:
        data = request.json
        content = data['content']
        tag = data['tag']
        title_id = data.get('title_id')  
        timestamp = datetime.now()
        
        new_note = Note(content=content, tag=tag, title_id=title_id, timestamp=timestamp)
        db.session.add(new_note)

        if title_id:
            title=Title.query.get(title_id)

            if title:
                title.timestamp=timestamp
        db.session.commit()
        
        return jsonify({'success': True, 'id': new_note.id, 'timestamp': timestamp.isoformat()})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in add_note: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to add note'}), 500

    
@app.route('/get_title')
def get_title():
    title_id = request.args.get('id')
    print(f"Requested title ID: {title_id}")
    if title_id:
        title = Title.query.get_or_404(int(title_id))
    else:
        title = Title.query.first()
    
    if not title:
        title = Title(title="Untitled")
        db.session.add(title)
        db.session.commit()
    
    print(f"Returning title: {title.title} (ID: {title.id})")
    return jsonify({'title': title.title, 'id': title.id})
    
@app.route('/update_title', methods=['POST'])
def update_title():
    try:
        new_title = request.json['title']
        title_id = request.json.get('title_id')
        
        if title_id:
            title = Title.query.get(title_id)
            if not title:
                return jsonify({'success': False, 'message': 'Title not found'}), 404
        else:
            title = Title()
            db.session.add(title)
        
        title.title = new_title
        title.timestamp = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True, 'title': new_title, 'id': title.id})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Failed to update title: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update title'}), 500
    
@app.route('/update_note_tag', methods=['POST'])
def update_note_tag():
    data = request.json
    note_id = data['id']
    new_tag = data['tag']
    
    note = Note.query.get(note_id)
    if note:
        note.tag = new_tag
        db.session.commit()
        return jsonify(success=True)
    else:
        return jsonify(success=False, message="Note not found"), 404

@app.route('/update_note', methods=['POST'])
def update_note():
    data = request.json
    note_id = data['id']
    new_content = data['newContent']
    
    note = Note.query.get(note_id)
    if note:
        note.content = new_content
        db.session.commit()
        return jsonify(success=True)
    else:
        return jsonify(success=False, message="Note not found"), 404
    
@app.route('/delete_note', methods=['POST'])
def delete_note():
    data = request.json
    note_id = data['id']
    
    note = Note.query.get(note_id)
    if note:
        db.session.delete(note)
        db.session.commit()
        return jsonify(success=True)
    else:
        return jsonify(success=False, message="Note not found"), 404
    
@app.route('/get_notes/<int:title_id>')
def get_notes(title_id):
    try:
        print(f"Fetching notes for title ID: {title_id}")
        notes = Note.query.filter_by(title_id=title_id).order_by(Note.timestamp.desc()).all()
        print(f"Found {len(notes)} notes")
        return jsonify([note.to_dict() for note in notes])
    except Exception as e:
        app.logger.error(f"Error in get_notes: {str(e)}")
        return jsonify({"error": "Failed to retrieve notes"}), 500


@app.route('/save_all_notes', methods=['POST'])
def save_all_notes():
    data = request.json
    notes = data['notes']
    title_text = data['title']
    title_id = data.get('title_id')
   

    try:
        if title_id:
            title = Title.query.get(title_id)
            if title:
                title.title = title_text
            else:
                title = Title(title=title_text)
                db.session.add(title)
        else:
            title = Title(title=title_text)
            db.session.add(title)

        title.timestamp=datetime.utcnow()
        
        db.session.flush()  # This will assign an id to new_title

        for note in notes:
            new_note = Note(content=note['content'], tag=note['tag'], title_id=title.id)
            db.session.add(new_note)

        db.session.commit()
        return jsonify(success=True, message="All notes saved successfully", title_id=title.id)
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, message=str(e)), 500
    
@app.route('/get_note_collections')
def get_note_collections():
    try:
        sort_by = request.args.get('sort', 'recent')
        search_term = request.args.get('search', '')

        query = Title.query

        if search_term:
            query = query.filter(Title.title.ilike(f'%{search_term}%'))

        if sort_by == 'recent':
            query = query.order_by(Title.id.desc())
        elif sort_by == 'oldest':
            query = query.order_by(Title.id.asc())
        elif sort_by == 'alphabetical':
            query = query.order_by(Title.title)

        titles = query.all()
        result = []
        for title in titles:
            notes = Note.query.filter_by(title_id=title.id).order_by(Note.timestamp.desc()).all()
            if notes:
                preview = notes[0].content[:100] + "..." if len(notes[0].content) > 100 else notes[0].content
                result.append({
                    'id': title.id,
                    'title': title.title,
                    'timestamp': notes[0].timestamp.isoformat(),
                    'preview': preview,
                    'count': len(notes)
                })
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error in get_note_collections: {str(e)}")
        return jsonify({"error": "Failed to retrieve note collections"}), 500
    
@app.route('/open_notes/<int:title_id>')
def open_notes(title_id):
    title = Title.query.get_or_404(title_id)
    is_new = request.args.get('new', 'false') == 'true'
    
    if is_new:
        print("Empty notes conditions")
        notes = []
    else:
        print("notes availbale conditions")
        notes = Note.query.filter_by(title_id=title_id).order_by(Note.timestamp.desc()).all()
    
    print(f"Opening notebook: {title_id} {title.title} Is new: {is_new}")
    print("print length of notes",len(notes))
    return render_template('index copy.html', title=title, notes=notes, is_new=is_new,title_id=title_id)


@app.route('/create_new_notebook', methods=['POST'])
def create_new_notebook():
    try:
        new_title = Title(title="Untitled")
        db.session.add(new_title)
        db.session.commit()
        print(f"New notebook created with ID: {new_title.id}")  
        return jsonify({'success': True, 'id': new_title.id,"title":new_title.title})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating new notebook: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/share_pdf/<int:id>')
def share_pdf(id):
    title = Title.query.get_or_404(id)
    notes = Note.query.filter_by(title_id=id).order_by(Note.timestamp.desc()).all()
    
    html = render_template('pdf_template.html', title=title, notes=notes)
    pdf = pdfkit.from_string(html, False)
    
    response = make_response(pdf)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename={title.title}.pdf'
    
    return response

@app.route('/delete_notebook/<int:id>', methods=['DELETE'])
def delete_notebook(id):
    title = Title.query.get_or_404(id)
    Note.query.filter_by(title_id=id).delete()
    db.session.delete(title)
    db.session.commit()
    return jsonify({'success': True})


if __name__ == "__main__":
  app.run(debug=True)



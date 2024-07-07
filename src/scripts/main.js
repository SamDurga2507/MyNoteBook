// DOM Elements
const darkModeToggle = document.getElementById("darkModeToggle");
const body = document.body;
const addNoteBtn = document.getElementById("add-note");
const noteTextArea = document.getElementById("note-text");
const clearBtn = document.getElementById("clear-note");
const notesContainer = document.querySelector(".notes-container");
const cancelButton = document.getElementById("cancel");
const searchInput = document.getElementById("search-input");

// Event Listeners
document.addEventListener("DOMContentLoaded", initializeApp);
darkModeToggle.addEventListener("click", toggleDarkMode);
addNoteBtn.addEventListener("click", () => addNotes());
clearBtn.addEventListener("click", clearNoteArea);
cancelButton.addEventListener("click", closeTagModal);
searchInput.addEventListener("input", performSearch);
noteTextArea.addEventListener("keydown", handleShiftEnter);

// Initialize the application
function initializeApp() {
    const topicButtons = document.querySelectorAll(".topic-tag");
    topicButtons.forEach(button => {
        button.addEventListener("click", handleTopicClick);
    });
}

// Toggle dark mode
function toggleDarkMode() {
    body.classList.toggle("dark-mode");
    const icon = darkModeToggle.querySelector("i");
    icon.classList.toggle("fa-moon");
    icon.classList.toggle("fa-sun");
}

// Handle topic tag click
function handleTopicClick(event) {
    const content = noteTextArea.value.trim();
    const tag = event.target.classList[1].split("-")[1];

    if (content === "") {
        showDialog("Please add content. Empty notes are not allowed.", null, false);
        return;
    }
    createNoteWithTag(content, tag);
}

// Add new note
function addNotes(tag = null) {
    const noteContent = noteTextArea.value.trim();
    if (noteContent === "") {
        showDialog("Please add content. Empty notes are not allowed.", null, false);
        return;
    }
    if (tag) {
        createNoteWithTag(noteContent, tag);
    } else {
        showTagModal(noteContent);
    }
}

// Clear note text area
function clearNoteArea() {
    noteTextArea.value = "";
}

// Create note with tag
function createNoteWithTag(content, tag) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString();

    const newNoteDiv = createNoteDiv(formattedDate, content, tag);
    notesContainer.prepend(newNoteDiv);

    noteTextArea.value = "";
    updateStats();
}

// Create new note div
function createNoteDiv(timestamp, content, tag) {
    const noteDiv = document.createElement("div");
    noteDiv.className = `note-item ${tag}`;

    noteDiv.innerHTML = `
        <div class="note-header">
            <div class="note-timestamp">${timestamp}</div>
            <div class="note-actions">
                <button class="action-btn copy-btn" title="Copy">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="action-btn edit-btn" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        <div class="note-content">${content}</div>
        <div class="note-tags">
            <span class="note-tag tag-${tag}">${tag}</span>
        </div>`;

    // Add event listeners for note actions
    noteDiv.querySelector(".copy-btn").addEventListener("click", () => copyNoteContent(content));
    noteDiv.querySelector(".delete-btn").addEventListener("click", () => deleteNote(noteDiv));
    noteDiv.querySelector(".edit-btn").addEventListener("click", () => editNote(noteDiv));

    // Add tag changing functionality
    const tagSpan = noteDiv.querySelector(".note-tag");
    tagSpan.addEventListener("click", () => showTagModal(noteDiv));

    return noteDiv;
}

// Show tag selection modal
function showTagModal(noteContentOrDiv) {
    const modal = document.getElementById("tagModal");
    modal.style.display = "block";

    const tagOptions = document.querySelectorAll(".tag-option");
    tagOptions.forEach(option => {
        option.replaceWith(option.cloneNode(true));
    });

    const newTagOptions = document.querySelectorAll(".tag-option");
    newTagOptions.forEach(option => {
        option.addEventListener("click", function() {
            const selectedTag = this.getAttribute("data-tag");
            if (typeof noteContentOrDiv === "string") {
                createNoteWithTag(noteContentOrDiv, selectedTag);
            } else if (noteContentOrDiv instanceof Element) {
                changeNoteTag(noteContentOrDiv, selectedTag);
            } else {
                console.error("Invalid input to showTagModal:", noteContentOrDiv);
            }
            modal.style.display = "none";
        });
    });
}

// Close tag modal
function closeTagModal() {
    const modal = document.getElementById("tagModal");
    modal.style.display = "none";
}

// Change note tag
function changeNoteTag(noteDiv, newTag) {
    noteDiv.className = `note-item ${newTag}`;
    const tagSpan = noteDiv.querySelector(".note-tag");
    tagSpan.className = `note-tag tag-${newTag}`;
    tagSpan.textContent = newTag;
    updateStats();
}

// Copy note content
function copyNoteContent(content) {
    navigator.clipboard.writeText(content)
        .then(() => showDialog("Note copied to clipboard!", null, false))
        .catch(err => console.error("Failed to copy note:", err));
}

// Delete note
function deleteNote(noteDiv) {
    showDialog("Are you sure you want to delete this note?", () => {
        noteDiv.remove();
        updateStats();
    });
}

// Edit note
function editNote(noteDiv) {
    const content = noteDiv.querySelector(".note-content");
    const currentContent = content.textContent;

    const editableDiv = document.createElement("div");
    editableDiv.contentEditable = true;
    editableDiv.className = "editable-content";
    editableDiv.textContent = currentContent;

    content.replaceWith(editableDiv);
    editableDiv.focus();

    editableDiv.addEventListener("blur", () => saveEdit(editableDiv));
}

// Save edited note
function saveEdit(editableDiv) {
    const newContent = editableDiv.textContent.trim();

    const contentDiv = document.createElement("div");
    contentDiv.className = "note-content";
    contentDiv.textContent = newContent;

    editableDiv.replaceWith(contentDiv);
}

// Update statistics
function updateStats() {
    const totalNotes = document.querySelectorAll('.note-item:not([style*="display: none"])').length;
    const importantNotes = document.querySelectorAll('.note-item.important:not([style*="display: none"])').length;
    const questions = document.querySelectorAll('.note-item.question:not([style*="display: none"])').length;

    document.getElementById("total-notes").textContent = totalNotes;
    document.getElementById("important-notes").textContent = importantNotes;
    document.getElementById("questions").textContent = questions;
}

// Handle Shift + Enter to add a new note
function handleShiftEnter(event) {
    if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        addNotes("general");
    }
}

// Show custom dialog
function showDialog(message, onConfirm, showCancel = true) {
    const dialog = document.getElementById("customDialog");
    const dialogMessage = document.getElementById("dialogMessage");
    const confirmButton = document.getElementById("dialogConfirm");
    const cancelButton = document.getElementById("dialogCancel");

    dialogMessage.textContent = message;
    dialog.style.display = "block";

    confirmButton.onclick = () => {
        dialog.style.display = "none";
        if (onConfirm) onConfirm();
    };

    if (showCancel) {
        cancelButton.style.display = "inline-block";
        cancelButton.onclick = () => {
            dialog.style.display = "none";
        };
    } else {
        cancelButton.style.display = "none";
    }
}

// Perform search
function performSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const allNotes = document.querySelectorAll(".note-item");

    allNotes.forEach(note => {
        const content = note.querySelector(".note-content").textContent.toLowerCase();
        const tag = note.querySelector(".note-tag").textContent.toLowerCase();
        const timestamp = note.querySelector(".note-timestamp").textContent;

        if (content.includes(searchTerm) || tag.includes(searchTerm) || timestamp.includes(searchTerm)) {
            note.style.display = "block";
        } else {
            note.style.display = "none";
        }
    });

    updateStats();
}
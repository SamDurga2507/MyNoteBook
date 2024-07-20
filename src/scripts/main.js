// DOM Elements
const darkModeToggle = document.getElementById("darkModeToggle");
const body = document.body;
const addNoteBtn = document.getElementById("add-note");
const noteTextArea = document.getElementById("note-text");
const clearBtn = document.getElementById("clear-note");
const notesContainer = document.querySelector(".notes-container");
const cancelButton = document.getElementById("cancel");
const searchInput = document.getElementById("search-input");
const titleContent = document.getElementById("main-title");
const editTitleIcon = document.getElementById("editTitleIcon");

// Global Variables
let notes = [];
let currentTitle = "Untitled";
let currentTitleId = null;

// Event Listeners
document.addEventListener("DOMContentLoaded", initializeApp);
darkModeToggle.addEventListener("click", toggleDarkMode);
addNoteBtn.addEventListener("click", () => addNotes());
clearBtn.addEventListener("click", clearNoteArea);
cancelButton.addEventListener("click", closeTagModal);
searchInput.addEventListener("input", performSearch);
noteTextArea.addEventListener("keydown", handleShiftEnter);

// Initialization
function initializeApp() {
  const topicButtons = document.querySelectorAll(".topic-tag");
  topicButtons.forEach((button) => {
    button.addEventListener("click", handleTopicClick);
  });

  const saveNotesIcon = document.getElementById("saveNotesIcon");
  if (saveNotesIcon) {
    saveNotesIcon.addEventListener("click", saveAllNotes);
  } else {
    console.error("saveNotesIcon element not found");
  }

  const titleElement = document.getElementById("main-title");
  if (titleElement) {
    currentTitle = titleElement.textContent;
    currentTitleId = titleElement.dataset.titleId;
    console.log("Current Title ID:", currentTitleId);

    const isNew =
      new URLSearchParams(window.location.search).get("new") === "true";
    if (isNew) {
      initializeNewNotebook(currentTitleId);
    } else {
      fetchAndSetTitle().then(() => {
        loadNotesFromServer();
      });
    }
  } else {
    console.log("Title element not found");
  }

  fetchAndSetTitle().then(() => {
    loadNotesFromServer();
  });

  if (document.getElementById("collections-container")) {
    populateDashboard();
  }

  editTitleIcon.addEventListener("click", function () {
    const currentTitle = titleContent.textContent;
    const input = document.createElement("input");

    input.type = "text";
    input.value = currentTitle;
    input.style.fontSize = "1.5rem";
    input.style.width = "100%";

    titleContent.replaceWith(input);
    input.focus();

    input.addEventListener("blur", function () {
      const newTitle = input.value.trim();
      if (newTitle) {
        titleContent.textContent = newTitle;
      }
      input.replaceWith(titleContent);
      updateTitle(newTitle);
    });

    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        input.blur();
      }
    });
  });
}

// Dark Mode Toggle
function toggleDarkMode() {
  body.classList.toggle("dark-mode");
  const icon = darkModeToggle.querySelector("i");
  icon.classList.toggle("fa-moon");
  icon.classList.toggle("fa-sun");
}

// Note Management Functions

// Add new note
function addNotes(tag = null) {
  const noteContent = noteTextArea.value.trim();
  if (noteContent === "") {
    showDialog("Please add content. Empty notes are not allowed.", null, false);
    return;
  }
  if (tag) {
    sendNoteToServer(noteContent, tag);
  } else {
    showTagModal(noteContent);
  }
}

// Send note to server
function sendNoteToServer(content, tag) {
  console.log("Sending note with Title ID", currentTitleId);
  fetch("/add_note", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: content,
      tag: tag,
      title_id: currentTitleId,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        const newNoteDiv = createNoteDiv(data.timestamp, content, tag, data.id);
        notesContainer.prepend(newNoteDiv);
        noteTextArea.value = "";
        updateStats();
      } else {
        throw new Error(data.message || "Failed to add note");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showDialog("Failed to add note. Please try again.", null, false);
    });
}

// Handle topic tag click
function handleTopicClick(event) {
  const content = noteTextArea.value.trim();
  const tag = event.target.classList[1].split("-")[1];

  if (content === "") {
    showDialog("Please add content. Empty notes are not allowed.", null, false);
    return;
  }
  sendNoteToServer(content, tag);
}

// Load notes from server
function loadNotesFromServer() {
  console.log("Loading notes for title ID:", currentTitleId);
  if (!currentTitleId) {
    console.log("No title selected, cannot load notes.");
    return;
  }

  fetch(`/get_notes/${currentTitleId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((notes) => {
      console.log("Notes received:", notes);
      notesContainer.innerHTML = ""; // Clear existing notes
      if (notes.length === 0) {
        notesContainer.innerHTML = "<p>No notes found for this title.</p>";
        return;
      }
      notes.forEach((note) => {
        const noteDiv = createNoteDiv(
          note.timestamp,
          note.content,
          note.tag,
          note.id
        );
        notesContainer.appendChild(noteDiv);
      });
      updateStats();
    })
    .catch((error) => {
      console.error("Error loading notes:", error);
      showDialog("Failed to load notes. Please try again.", null, false);
    });
}

// Create new note div
function createNoteDiv(timestamp, content, tag, id) {
  const date = new Date(timestamp);
  const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  const noteDiv = document.createElement("div");
  noteDiv.className = `note-item ${tag}`;
  noteDiv.dataset.id = id;

  noteDiv.innerHTML = `
    <div class="note-header">
      <div class="note-timestamp">${formattedDate}</div>
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
  noteDiv
    .querySelector(".copy-btn")
    .addEventListener("click", () => copyNoteContent(content));
  noteDiv
    .querySelector(".delete-btn")
    .addEventListener("click", () => deleteNote(noteDiv));
  noteDiv
    .querySelector(".edit-btn")
    .addEventListener("click", () => editNote(noteDiv));

  // Add tag changing functionality
  const tagSpan = noteDiv.querySelector(".note-tag");
  tagSpan.addEventListener("click", () => showTagModal(noteDiv));

  return noteDiv;
}

// Clear note text area
function clearNoteArea() {
  noteTextArea.value = "";
}

// Update statistics
function updateStats() {
  const totalNotes = document.querySelectorAll(
    '.note-item:not([style*="display: none"])'
  ).length;
  const importantNotes = document.querySelectorAll(
    '.note-item.important:not([style*="display: none"])'
  ).length;
  const questions = document.querySelectorAll(
    '.note-item.question:not([style*="display: none"])'
  ).length;

  document.getElementById("total-notes").textContent = totalNotes;
  document.getElementById("important-notes").textContent = importantNotes;
  document.getElementById("questions").textContent = questions;
}
// Note Editing and Deletion

// Copy note content
function copyNoteContent(content) {
  navigator.clipboard
    .writeText(content)
    .then(() => showFeedback("Copied!"))
    .catch((err) => console.error("Failed to copy note:", err));
}

// Delete note
function deleteNote(noteDiv) {
  showDialog("Are you sure you want to delete this note?", () => {
    const noteId = noteDiv.dataset.id;
    fetch("/delete_note", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: noteId }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          noteDiv.remove();
          updateStats();
        } else {
          console.error("Failed to delete note on server:", data.error);
        }
      })
      .catch((error) => console.error("Error:", error));
  });
}

// Edit note
function editNote(noteDiv) {
  const noteId = noteDiv.dataset.id;
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
  const noteDiv = editableDiv.closest(".note-item");
  const noteId = noteDiv.dataset.id;

  fetch("/update_note", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: noteId, newContent: newContent }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const contentDiv = document.createElement("div");
        contentDiv.className = "note-content";
        contentDiv.textContent = newContent;
        editableDiv.replaceWith(contentDiv);
      } else {
        console.error("Failed to update note on server:", data.error);
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Tag Management and Search

// Show tag selection modal
function showTagModal(noteContentOrDiv) {
  const modal = document.getElementById("tagModal");
  modal.style.display = "block";

  const tagOptions = document.querySelectorAll(".tag-option");
  tagOptions.forEach((option) => {
    option.replaceWith(option.cloneNode(true));
  });

  const newTagOptions = document.querySelectorAll(".tag-option");
  newTagOptions.forEach((option) => {
    option.addEventListener("click", function () {
      const selectedTag = this.getAttribute("data-tag");
      if (typeof noteContentOrDiv === "string") {
        sendNoteToServer(noteContentOrDiv, selectedTag);
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
  const noteId = noteDiv.dataset.id;
  fetch("/update_note_tag", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: noteId, tag: newTag }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        noteDiv.className = `note-item ${newTag}`;
        const tagSpan = noteDiv.querySelector(".note-tag");
        tagSpan.className = `note-tag tag-${newTag}`;
        tagSpan.textContent = newTag;
        updateStats();
      } else {
        console.error("Failed to update tag on server:", data.error);
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Perform search
function performSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  const allNotes = document.querySelectorAll(".note-item");

  allNotes.forEach((note) => {
    const content = note
      .querySelector(".note-content")
      .textContent.toLowerCase();
    const tag = note.querySelector(".note-tag").textContent.toLowerCase();
    const timestamp = note.querySelector(".note-timestamp").textContent;

    if (
      content.includes(searchTerm) ||
      tag.includes(searchTerm) ||
      timestamp.includes(searchTerm)
    ) {
      note.style.display = "block";
    } else {
      note.style.display = "none";
    }
  });

  updateStats();
}

// Handle Shift + Enter to add a new note
function handleShiftEnter(event) {
  if (event.key === "Enter" && event.shiftKey) {
    event.preventDefault();
    addNotes("general");
  }
}

// Title Management and Notebook Initialization

function updateTitle(newTitle) {
  fetch("/update_title", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: newTitle, title_id: currentTitleId }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        currentTitle = data.title;
        currentTitleId = data.id;
        titleContent.textContent = currentTitle;
        console.log("Title updated successfully:", data.title);
        showDialog("Title saved successfully!", null, false);
      } else {
        console.error("Failed to update title");
        showDialog("Failed to save title. Please try again.", null, false);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showDialog("An error occurred while saving the title.", null, false);
    });
}

function fetchAndSetTitle() {
  return fetch(`/get_title?id=${currentTitleId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.title) {
        currentTitle = data.title;
        currentTitleId = data.id;
        const titleElement = document.getElementById("main-title");
        if (titleElement) {
          titleElement.textContent = currentTitle;
          titleElement.dataset.titleId = currentTitleId;
        }
        console.log(
          "Title fetched successfully:",
          currentTitle,
          "ID:",
          currentTitleId
        );
      } else {
        console.log("No title data received");
        currentTitle = "Untitled";
        currentTitleId = null;
      }
    })
    .catch((error) => {
      console.error("Error fetching title:", error);
      currentTitle = "Untitled";
      currentTitleId = null;
      const titleElement = document.getElementById("main-title");
      if (titleElement) {
        titleElement.textContent = currentTitle;
      }
    });
}

function initializeNewNotebook(id) {
  currentTitleId = id;
  document.querySelector(".notes-container").innerHTML = "";
  document.getElementById("total-notes").textContent = "0";
  document.getElementById("important-notes").textContent = "0";
  document.getElementById("questions").textContent = "0";
  document.getElementById("note-text").value = "";

  const message = document.createElement("p");
  message.textContent = "This is a new notebook. Start adding notes!";
  document.querySelector(".notes-container").appendChild(message);

  fetchAndSetTitle().then(() => {
    console.log("New notebook initialized with ID:", currentTitleId);
    document.getElementById("main-title").textContent = "Untitled";
  });
}

// Utility Functions and Dashboard Population

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

// Show feedback function
function showFeedback(message) {
  const popup = document.getElementById("feedback-popup");
  const messageElement = document.getElementById("feedback-message");
  messageElement.textContent = message;
  popup.style.display = "block";
  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => {
      popup.style.display = "none";
      popup.style.opacity = "1";
    }, 300);
  }, 3000);
}

// Save all notes
function saveAllNotes() {
  console.log("Save all notes called");
  const title = titleContent.textContent;
  console.log("Current title for save all notes", title);

  const notes = Array.from(document.querySelectorAll(".note-item")).map(
    (noteDiv) => ({
      content: noteDiv.querySelector(".note-content").textContent,
      tag: noteDiv.querySelector(".note-tag").textContent,
    })
  );
  fetch("/save_all_notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, notes, title_id: currentTitleId }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showFeedback("Notes saved successfully!");
      } else {
        showFeedback("Error saving notes. Please try again.");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showDialog("An error occurred while saving the notes", null, false);
    });
}

// Populate dashboard
function populateDashboard() {
  fetch("/get_note_collections")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((collections) => {
      const container = document.getElementById("collections-container");
      if (!container) {
        console.error("Element with id 'collections-container' not found");
        return;
      }

      container.innerHTML = "";

      if (collections.length === 0) {
        container.innerHTML = "<p>No collections found.</p>";
        return;
      }

      collections.forEach((collection) => {
        const card = createCollectionCard(collection);
        container.appendChild(card);
      });
    })
    .catch((error) => {
      console.error("Error populating dashboard:", error);
      const container = document.getElementById("collections-container");
      if (container) {
        container.innerHTML =
          "<p>An error occurred while loading collections. Please try again later.</p>";
      }
    });
}

// Note: The createCollectionCard function is not provided in the original code.
// You may need to implement this function based on your specific requirements.

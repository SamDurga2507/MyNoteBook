document.addEventListener("DOMContentLoaded", function () {
  fetchNoteCollections();
  document
    .getElementById("sortFilter")
    .addEventListener("change", fetchNoteCollections);
  document
    .getElementById("searchInput")
    .addEventListener("input", fetchNoteCollections);
  document
    .getElementById("createNewNotebook")
    .addEventListener("click", createNewNotebook);
});

function fetchNoteCollections() {
  const sortBy = document.getElementById("sortFilter").value;
  const searchTerm = document.getElementById("searchInput").value;

  fetch(`/get_note_collections?sort=${sortBy}&search=${searchTerm}`)
    .then((response) => response.json())
    .then((collections) => {
      const container = document.getElementById("collections-container");
      container.innerHTML = ""; // Clear existing cards
      collections.forEach((collection) => {
        const card = createCollectionCard(collection);
        container.appendChild(card);
      });
    })
    .catch((error) => console.error("Error fetching collections:", error));
}

function createCollectionCard(collection) {
  const card = document.createElement("div");
  card.className = "collection-card";
  card.innerHTML = `
    <h2>${collection.title}</h2>
    <p class="timestamp">Saved on: ${new Date(
      collection.timestamp
    ).toLocaleString()}</p>
    <p class="preview">${collection.preview}</p>
    <p class="note-count">Notes: ${collection.count}</p>
    <div class="card-actions">
      <a href="/open_notes/${
        collection.id
      }" class="open-notes-btn">Open Notes</a>
      <button class="delete-btn" data-id="${collection.id}">Delete</button>
      <button class="share-pdf-btn" data-id="${
        collection.id
      }">Share as PDF</button>
    </div>
  `;

  card.querySelector(".delete-btn").addEventListener("click", function () {
    deleteNotebook(collection.id);
  });

  card.querySelector(".share-pdf-btn").addEventListener("click", function () {
    sharePDF(collection.id);
  });

  return card;
}

function createNewNotebook() {
  fetch("/create_new_notebook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        window.location.href = `/open_notes/${data.id}?new=true`;
      } else {
        alert("Failed to create new notebook");
      }
    })
    .catch((error) => console.error("Error:", error));
}

function deleteNotebook(id) {
  if (confirm("Are you sure you want to delete this notebook?")) {
    fetch(`/delete_notebook/${id}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          fetchNoteCollections();
        } else {
          alert("Failed to delete notebook");
        }
      })
      .catch((error) => console.error("Error:", error));
  }
}

function sharePDF(id) {
  window.open(`/share_pdf/${id}`, "_blank");
}

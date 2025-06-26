function saveOptions(e) {
  e.preventDefault();

  const selectedLanguage = document.getElementById("language").value;
  const selectedVoice = document.getElementById("voiceSelect").value;

  browser.storage.sync.set({
    language: selectedLanguage,
    pronunciation: selectedVoice,
  }).then(() => {
    console.log("[Popup Dictionary] Options saved");
  }).catch((err) => {
    console.error("[Popup Dictionary] Error saving options:", err);
  });
}

function restoreOptions() {
  // Trigger early voice population (needed in Firefox)
  speechSynthesis.getVoices();

  browser.storage.sync.get(["language", "pronunciation"]).then((res) => {
    const language = res.language || "english";
    const pronunciation = res.pronunciation || "";

    const languageSelect = document.getElementById("language");
    const voiceSelect = document.getElementById("voiceSelect");

    languageSelect.value = language;
    toggleVoiceSelectVisibility(language);

    function applyVoiceSelection() {
      populateVoiceList();

      if (pronunciation) {
        for (let i = 0; i < voiceSelect.options.length; i++) {
          if (voiceSelect.options[i].value === pronunciation) {
            voiceSelect.selectedIndex = i;
            break;
          }
        }
      }
    }

    // Run immediately if voices already loaded
    if (speechSynthesis.getVoices().length > 0) {
      applyVoiceSelection();
    } else {
      speechSynthesis.onvoiceschanged = applyVoiceSelection;
    }
  }).catch((err) => {
    console.error("[Popup Dictionary] Error restoring options:", err);
  });
}

function populateVoiceList() {
  const voiceSelect = document.getElementById("voiceSelect");
  voiceSelect.innerHTML = ""; // Clear any existing options

  const voices = speechSynthesis.getVoices();

  for (const voice of voices) {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.default) {
      option.textContent += " — DEFAULT";
    }
    voiceSelect.appendChild(option);
  }

  console.log(`[Popup Dictionary] Loaded ${voices.length} voices`);
}

function toggleVoiceSelectVisibility(language) {
  const section = document.getElementById("pronunciation-selection");
  section.style.display = language === "english" ? "block" : "none";
}

// Event listeners
document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("language").addEventListener("change", (e) => {
  toggleVoiceSelectVisibility(e.target.value);
});
document.querySelector("form").addEventListener("submit", saveOptions);

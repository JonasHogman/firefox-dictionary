function saveOptions(e) {
  browser.storage.sync.set({
    language: document.getElementById("language").value,
    pronunciation: document.getElementById("pronunciation").value,
  });
  e.preventDefault();
}

function restoreOptions() {
  var gettingLanguage = browser.storage.sync.get("language");
  gettingLanguage.then((res) => {
    document.getElementById("language").value = res.language || "english";
  });
  var gettingPronunciation = browser.storage.sync.get("pronunciation");
  gettingPronunciation.then((res) => {
    document.getElementById("pronunciation").value = res.pronuncation || "us";
  });
  var style =
    document.getElementById("language").value == "english" ? "block" : "none";
  document.getElementById("pronunciation-selection").style.display = style;

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  let getting = browser.storage.sync.get("language");
  getting.then(setCurrentChoice, onError);
}

function showPronunciationSelection() {
  var style =
    document.getElementById("language").value == "english" ? "block" : "none";
  document.getElementById("pronunciation-selection").style.display = style;
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document
  .getElementById("language")
  .addEventListener("change", showPronunciationSelection);
document.querySelector("form").addEventListener("submit", saveOptions);

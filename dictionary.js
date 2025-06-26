"use strict";

function removeExistingPopup() {
  // remove container if it already exists
  if (document.contains(document.getElementById("gdx-iframe"))) {
    let tooltipElement = document.getElementById("gdx-iframe");
    tooltipElement.remove();
  }
}

function getSelectedWord(selection) {
  var word = selection.toString().trim();

  // check that selection exists and that it contains no whitespace character
  if (word && /\s/.test(word) === false) {
    return word;
  } else {
    return false;
  }
}

function getLanguageShorthand(selectedLanguage) {
  const languageMap = {
    english: "en",
  };

  return languageMap[selectedLanguage] || "en";
}

function createIframe() {
  let iframe = document.createElement("iframe");
  iframe.id = "gdx-iframe";
  iframe.style.border = "none"
  iframe.style.overflow = "hidden"
  iframe.style.opacity = 0;
  iframe.src = browser.runtime.getURL("styling/popup.html");

  document.body.appendChild(iframe);

  return iframe;
}
function populateIframe(languageShorthand, word, iframe) {
  const apiURL = `https://api.dictionaryapi.dev/api/v2/entries/${encodeURIComponent(languageShorthand)}/${encodeURIComponent(word)}`;
  console.log("[Popup Dictionary] Fetching definition from:", apiURL);

  fetch(apiURL)
    .then((res) => {
      console.log("[Popup Dictionary] API response status:", res.status);
      return res.json();
    })
    .then((apiResponse) => {
      const doc = iframe.contentDocument;
      if (!doc) {
        console.error("[Popup Dictionary] Iframe contentDocument is null");
        return;
      }

      const queryEl = doc.getElementById("gdx-bubble-query");
      const meaningEl = doc.getElementById("gdx-bubble-meaning");
      const wordTypeEl = doc.getElementById("gdx-bubble-wordtype");
      const linkEl = doc.getElementById("gdx-bubble-link");

      if (!queryEl || !meaningEl || !wordTypeEl || !linkEl) {
        console.error("[Popup Dictionary] Missing expected elements in popup.html");
        return;
      }

      console.log("[Popup Dictionary] API response:", apiResponse);

      if (apiResponse.title === "No Definitions Found") {
        queryEl.textContent = "Not found";
        meaningEl.textContent = "No definition could be found for this word";
      } else if (apiResponse.title === "API Rate Limit Exceeded") {
        queryEl.textContent = "Rate limited";
        meaningEl.textContent = "Rate limit exceeded, try again later";
      } else {
        const entry = apiResponse[0];
        queryEl.textContent = entry.word;
        wordTypeEl.textContent = entry.meanings[0].partOfSpeech;
        meaningEl.textContent = entry.meanings[0].definitions[0].definition;
        linkEl.href = `https://www.google.com/search?q=define+${encodeURIComponent(entry.word)}`;
        if (languageShorthand === "en") {
          setPronunciationAudio(entry.word);
        }
      }

      setTimeout(() => {
        if (!doc || !doc.documentElement) {
          console.error("[Popup Dictionary] Unable to size iframe: doc is invalid");
          return;
        }
        const mainBubble = doc.getElementById("gdx-bubble-main");

        const width = mainBubble.scrollWidth;
        const height = mainBubble.scrollHeight;


        iframe.style.width = width + "px";
        iframe.style.height = height + "px";
        iframe.style.visibility = "visible";
        iframe.style.borderRadius = "3px";
        iframe.style.overflow = "hidden";
        iframe.style.transition = "opacity 0.05s ease-in-out";
        iframe.style.opacity = 1;

        positionIframe(iframe, window.getSelection());
        console.log("[Popup Dictionary] Popup rendered at:", iframe.style.top, iframe.style.left);
      }, 50);
    })
    .catch((err) => {
      console.error("[Popup Dictionary] Definition fetch failed:", err);
    });
}

function setPronunciationAudio(word) {
  if (!word) {
    console.warn("[Popup Dictionary] No word provided for pronunciation");
    return;
  }
  console.log("[Popup Dictionary] setPronunciationAudio() called");

  browser.storage.sync.get("pronunciation").then((item) => {
    console.log("[Popup Dictionary] Pronunciation setting:", item.pronunciation);

    const iframe = document.getElementById("gdx-iframe");
    if (!iframe) {
      console.warn("[Popup Dictionary] Iframe not found");
      return;
    }

    const doc = iframe.contentDocument;
    if (!doc) {
      console.warn("[Popup Dictionary] Iframe contentDocument not accessible");
      return;
    }

    const icon = doc.getElementById("gdx-bubble-audio-icon");
    const wordEl = doc.getElementById("gdx-bubble-query");

    if (!icon) {
      console.warn("[Popup Dictionary] Audio icon element not found");
      return;
    }
    if (!wordEl) {
      console.warn("[Popup Dictionary] Word element not found");
      return;
    }

    const word = wordEl.textContent;
    console.log("[Popup Dictionary] Word to pronounce:", word);

    icon.style.display = "inline";

    function speakWord() {
      console.log("[Popup Dictionary] speakWord() called");

      if (!word) {
        console.warn("[Popup Dictionary] No word to speak");
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      const preferredRegion = item.pronunciation === "uk" ? "en-GB" : "en-US";

      let voices = window.speechSynthesis.getVoices();
      console.log("[Popup Dictionary] Voices available:", voices.length);

      if (!voices.length) {
        console.log("[Popup Dictionary] Voices not loaded yet, waiting for voiceschanged event");
        window.speechSynthesis.addEventListener(
          "voiceschanged",
          () => {
            voices = window.speechSynthesis.getVoices();
            console.log("[Popup Dictionary] Voices loaded after event:", voices.length);
            utterance.voice = voices.find((v) => v.lang === preferredRegion) || null;
            console.log("[Popup Dictionary] Selected voice:", utterance.voice ? utterance.voice.name : "default");
            window.speechSynthesis.speak(utterance);
          },
          { once: true }
        );
      } else {
        utterance.voice = voices.find((v) => v.lang === preferredRegion) || null;
        console.log("[Popup Dictionary] Selected voice:", utterance.voice ? utterance.voice.name : "default");
        window.speechSynthesis.speak(utterance);
      }
    }

    icon.onclick = () => {
      console.log("[Popup Dictionary] Audio icon clicked");
      speakWord();
    };
  }).catch((err) => {
    console.error("[Popup Dictionary] Pronunciation error:", err);
  });
}

function positionIframe(iframe, selection) {
  const range = selection.getRangeAt(0).cloneRange();
  const rect = range.getBoundingClientRect();
  console.log("[Popup Dictionary] selection rect:", rect);

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
  const margin = 10;

  const iframeWidth = iframe.offsetWidth || 300; // fallback width
  const iframeHeight = iframe.offsetHeight || 150; // fallback height

  let top = rect.bottom + scrollTop + margin;
  let left = rect.left + scrollLeft;

  // If the popup would go off the screen, reposition it
  if ((top + iframeHeight) > (scrollTop + window.innerHeight)) {
    top = rect.top + scrollTop - iframeHeight - margin;
  }

  if ((left + iframeWidth) > (scrollLeft + window.innerWidth)) {
    left = scrollLeft + window.innerWidth - iframeWidth - margin;
  }

  iframe.style.position = "absolute";
  iframe.style.top = `${top}px`;
  iframe.style.left = `${left}px`;
  iframe.style.zIndex = "999999";
  iframe.style.boxShadow = "0 0.5px 2px rgba(0, 0, 0, 0.4)";
}

function main() {
  setTimeout(() => {
    console.log("[Popup Dictionary] main() triggered");

    removeExistingPopup();
    console.log("[Popup Dictionary] Existing popup (if any) removed");

    const selection = window.getSelection();
    const word = getSelectedWord(selection);

    console.log("[Popup Dictionary] Selected text:", selection.toString());
    if (!word) {
      console.log("[Popup Dictionary] Invalid selection (likely whitespace or empty)");
      return;
    }

    browser.storage.sync.get("language").then((res) => {
      const selectedLanguage = res.language || "english";
      const languageShorthand = getLanguageShorthand(selectedLanguage);

      console.log("[Popup Dictionary] Language:", selectedLanguage, "->", languageShorthand);
      console.log("[Popup Dictionary] Word to define:", word);

      const iframe = createIframe();
      console.log("[Popup Dictionary] Iframe created");

      iframe.onload = () => {
        console.log("[Popup Dictionary] Iframe loaded");
        populateIframe(languageShorthand, word, iframe);
        positionIframe(iframe, selection);

        if (languageShorthand === "en") {
          setPronunciationAudio();
        }
      };
    }).catch((err) => {
      console.error("[Popup Dictionary] Error fetching language from storage:", err);
    });
  }, 10); // slight delay to allow selection to settle
}

document.onmouseup = main;
document.onkeyup = main;

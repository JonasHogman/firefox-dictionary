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
  var languageShorthand = "en";
  switch (selectedLanguage.language) {
    case "english":
      languageShorthand = "en";
      break;
    case "hindi":
      languageShorthand = "hi";
      break;
    case "spanish":
      languageShorthand = "es";
      break;
    case "french":
      languageShorthand = "fr";
      break;
    case "japanese":
      languageShorthand = "ja";
      break;
    case "russian":
      languageShorthand = "ru";
      break;
    case "german":
      languageShorthand = "de";
      break;
    case "italian":
      languageShorthand = "it";
      break;
    case "korean":
      languageShorthand = "ko";
      break;
    case "brazilian-portugese":
      languageShorthand = "pt-BR";
      break;
    case "chinese-simplified":
      languageShorthand = "zh-CN";
      break;
    case "arabic":
      languageShorthand = "ar";
      break;
    case "turkish":
      languageShorthand = "tr";
      break;
  }
  return languageShorthand;
}

function createIframe() {
  var iframeElement = document.createElement("iframe");
  iframeElement.id = "gdx-iframe";
  iframeElement.frameBorder = "0";
  iframeElement.scrolling = "no";
  iframeElement.src = browser.runtime.getURL("styling/popup.html");
  document.body.appendChild(iframeElement);

  return iframeElement;
}

function populateIframe(languageShorthand, word, iframe) {
  var apiURL =
    "https://api.dictionaryapi.dev/api/v2/entries/" +
    encodeURI(languageShorthand) +
    "/" +
    encodeURI(word);

  fetch(apiURL)
    .then((res) => res.json())
    .then((apiResponse) => {
      var doc = iframe.contentDocument;
      if (apiResponse.title === "No Definitions Found") {
        doc.getElementById("gdx-bubble-query").textContent = "Not found";
        doc.getElementById("gdx-bubble-meaning").textContent =
          "No definition could be found for this word";
      } else if (apiResponse.title === "API Rate Limit Exceeded") {
        doc.getElementById("gdx-bubble-query").textContent = "Rate limited";
        doc.getElementById("gdx-bubble-meaning").textContent =
          "The unofficial Google Dictionary API has been rate limited by the upstream server, please try again later";
      } else {
        let word = apiResponse[0].word;
        let wordType = apiResponse[0].meanings[0].partOfSpeech;
        let definition = apiResponse[0].meanings[0].definitions[0].definition;

        doc.getElementById("gdx-bubble-query").textContent = word;
        doc.getElementById("gdx-bubble-wordtype").textContent = wordType;
        doc.getElementById("gdx-bubble-meaning").textContent = definition;
        doc.getElementById("gdx-bubble-link").href =
          "https://www.google.com/search?q=define+" + encodeURI(word) + "";

        iframe.height = doc.body.scrollHeight + 10;
      }
      return true;
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
}

function setPronunciationAudio() {
  var chosenPronunciation = browser.storage.sync.get("pronunciation");
  chosenPronunciation.then(function (item) {
    let doc = document.getElementById("gdx-iframe").contentDocument;
    let audio = doc.getElementById("gdx-bubble-audio");
    let word = doc.getElementById("gdx-bubble-query").textContent.toLowerCase();

    var url =
      "https://ssl.gstatic.com/dictionary/static/sounds/oxford/" +
      encodeURI(word) +
      "--_" +
      (item.pronunciation === "uk" ? "gb" : "us") +
      "_1.mp3";

    var http = new XMLHttpRequest();
    http.open("HEAD", url, false);
    http.send();
    if (http.status != 404) {
      doc.getElementById("gdx-bubble-audio-icon").style.display = "inline";
      doc.getElementById("gdx-bubble-audio").src = url;
      doc.getElementById("gdx-bubble-audio-icon").onclick = function () {
        audio.play();
      };
    }
  }, onError);
}

function positionIframe(iframe, selection) {
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0).cloneRange();
  const rect = range.getBoundingClientRect();

  if (!rect) return;

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

  const margin = 10;
  const iframeWidth = 300;  // Set a default width if not known yet
  const iframeHeight = 150; // Set a default height if not known yet

  let top = rect.bottom + scrollTop + margin;
  let left = rect.left + scrollLeft;

  // Adjust if iframe would overflow bottom of viewport
  if ((top + iframeHeight) > (scrollTop + window.innerHeight)) {
    top = rect.top + scrollTop - iframeHeight - margin;
  }

  // Adjust if iframe would overflow right of viewport
  if ((left + iframeWidth) > (scrollLeft + window.innerWidth)) {
    left = scrollLeft + window.innerWidth - iframeWidth - margin;
  }

  // Apply position
  iframe.style.position = "absolute";
  iframe.style.top = `${top}px`;
  iframe.style.left = `${left}px`;
  iframe.style.zIndex = "9999";
}

function onError(err) {
  console.log(err);
  throw err;
}

function main() {
  removeExistingPopup();

  var selection = window.getSelection();
  var word = getSelectedWord(selection);
  console.log(word);

  // continue if selection is valid
  if (word) {
    var chosenLanguage = browser.storage.sync.get("language");
    chosenLanguage.then((res) => {
      let languageShorthand = getLanguageShorthand(res.language);
      let iframe = createIframe();

      iframe.onload = () => {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc && doc.body) {
          iframe.style.height = doc.body.scrollHeight + 10 + "px";
        }
      };

      positionIframe(iframe, selection);
      populateIframe(languageShorthand, word, iframe);

      if (languageShorthand == "en") {
        setPronunciationAudio();
      }
    });
  }
}

document.onmouseup = main;
document.onkeyup = main;

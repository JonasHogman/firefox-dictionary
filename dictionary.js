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
  var span = document.createElement("span");
  span.setAttribute("id", "gdx-selection");

  let range = selection.getRangeAt(0).cloneRange();
  range.surroundContents(span);
  selection.removeAllRanges();
  selection.addRange(range);

  let selectedElement = document.getElementById("gdx-selection");

  var viewportOffset = selectedElement.getBoundingClientRect();

  var windowWidth = window.innerWidth;
  var windowHeight = window.innerHeight;

  var linkHeight = viewportOffset.height;
  var linkWidth = viewportOffset.width;

  var scrollTop = window.scrollY;
  var scrollLeft = window.scrollX;

  var top = viewportOffset.top;
  var left = viewportOffset.left;

  var bottom = windowHeight - top - linkHeight;
  var right = windowWidth - left - linkWidth;

  var topbottom = top < bottom ? bottom : top;
  var leftright = left < right ? right : left;

  var iframeHeight = iframe.getBoundingClientRect().height;
  var iframeWidth = iframe.getBoundingClientRect().width;

  iframe.style.position = "absolute";

  if (topbottom === bottom && leftright === right) {
    let yPos = top + scrollTop;
    let xPos = left + linkWidth + 5 + scrollLeft;
    iframe.style.top = yPos + "px";
    iframe.style.left = xPos + "px";
  } else if (topbottom === bottom && leftright === left) {
    let yPos = top + scrollTop;
    let xPos = right + linkWidth + 5 + scrollLeft;
    iframe.style.top = yPos + "px";
    iframe.style.right = xPos + "px";
  } else if (topbottom === top && leftright === right) {
    let yPos = top - iframeHeight - linkHeight / 2 + scrollTop;
    let xPos = left + linkWidth + 5 + scrollLeft;
    iframe.style.top = yPos + "px";
    iframe.style.left = xPos + "px";
  } else if (topbottom === top && leftright === left) {
    let yPos = top - iframeHeight - linkHeight / 2 + scrollTop;
    let xPos = left - iframeWidth - linkWidth + scrollLeft;
    iframe.style.top = yPos + "px";
    iframe.style.left = xPos + "px";
  }

  let textToRestore = selectedElement.textContent;
  selectedElement.parentNode.replaceChild(
    document.createTextNode(textToRestore),
    selectedElement
  );

  return true;
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

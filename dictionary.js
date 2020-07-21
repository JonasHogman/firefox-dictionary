"use strict";

function initializePopup(item) {
  // remove container if it already exists
  if (document.contains(document.querySelector("#gdx-iframe"))) {
    let tooltipElement = document.querySelector("#gdx-iframe");
    tooltipElement.parentNode.removeChild(tooltipElement);
  }
  // remove tag around selection if it already exists
  if (document.contains(document.querySelector("#gdx-selection"))) {
    let selectedElement = document.querySelector("#gdx-selection");
    let textToRestore = selectedElement.textContent;
    selectedElement.parentNode.replaceChild(
      document.createTextNode(textToRestore),
      selectedElement
    );
  }

  // only add event listener after double-click event to avoid mistakenly dismissing popup immediately, and delete
  // it after container has been removed
  document.body.addEventListener("click", dismissContainer);

  var languageShorthand = "en";
  switch (item.language) {
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

  // process current selection
  var selection = window.getSelection();
  var selectionText = selection ? selection.toString().trim() : null;

  if (selectionText) {
    // create span tag around selection
    var span = document.createElement("span");
    span.setAttribute("id", "gdx-selection");

    if (selection.rangeCount) {
      let range = selection.getRangeAt(0).cloneRange();
      range.surroundContents(span);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    populateIframe(selectionText, languageShorthand);
  }
}

function dismissContainer() {
  var elem = document.querySelector("#gdx-iframe");
  elem.parentNode.removeChild(elem);
  document.body.removeEventListener("click", dismissContainer);
}

function populateIframe(selectionText, languageShorthand) {
  // create iframe
  var iframeElement = document.createElement("iframe");
  iframeElement.id = "gdx-iframe";
  iframeElement.frameBorder = "0";
  iframeElement.scrolling = "no";
  iframeElement.src = browser.runtime.getURL("styling/popup.html");
  document.body.appendChild(iframeElement);

  calculateTooltipPosition(
    iframeElement,
    document.getElementById("gdx-selection")
  );

  var apiURL =
    "https://api.dictionaryapi.dev/api/v2/entries/" +
    encodeURI(languageShorthand) +
    "/" +
    encodeURI(selectionText);

  fetch(apiURL)
    .then((res) => res.json())
    .then((apiResponse) => {
      let doc = document.getElementById("gdx-iframe").contentDocument;
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
        let phonetic = apiResponse[0].phonetic;
        let wordType = apiResponse[0].meanings[0].partOfSpeech;
        let definition = apiResponse[0].meanings[0].definitions[0].definition;
        let audio = new Audio(
          "https://ssl.gstatic.com/dictionary/static/sounds/oxford/" +
            encodeURI(word) +
            "--_gb_1.mp3"
        );

        doc.getElementById("gdx-bubble-query").textContent = word;
        doc.getElementById("gdx-bubble-phonetics").textContent = phonetic;
        doc.getElementById("gdx-bubble-wordtype").textContent = wordType;
        doc.getElementById("gdx-bubble-meaning").textContent = definition;
        doc.getElementById("gdx-bubble-link").href =
          "https://www.google.com/search?q=define+" + encodeURI(word) + "";

        if (languageShorthand == "en") {
          doc.getElementById("gdx-bubble-audio-icon").onclick = function () {
            gdxPlay();
          };
        }
      }
      iframeElement.height = doc.body.scrollHeight + 10;
    })
    .catch((err) => {
      throw err;
    });
}
function gdxPlay() {
  var chosenPronunciation = browser.storage.sync.get("pronunciation");
  chosenPronunciation.then(function (item) {
    let doc = document.getElementById("gdx-iframe").contentDocument;
    let audio = doc.getElementById("gdx-bubble-audio");
    let word = doc.getElementById("gdx-bubble-query").textContent.toLowerCase();
    audio.src =
      "https://ssl.gstatic.com/dictionary/static/sounds/oxford/" +
      encodeURI(word) +
      "--_" +
      (item.pronunciation === "uk" ? "gb" : "us") +
      "_1.mp3";

    audio.play();
  }, onError);
}

function calculateTooltipPosition(tooltipId, selection) {
  var viewportOffset = selection.getBoundingClientRect();

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  var linkHeight = selection.offsetHeight;
  var linkWidth = selection.offsetWidth;

  var scrollTop = window.scrollY;
  var scrollLeft = window.scrollX;

  var top = viewportOffset.top;
  var left = viewportOffset.left;

  var bottom = windowHeight - top - linkHeight;
  var right = windowWidth - left - linkWidth;

  var topbottom = top < bottom ? bottom : top;
  var leftright = left < right ? right : left;

  var tooltiph = 120;
  var tooltipw = 250;

  tooltipId.style.position = "absolute";

  if (topbottom === bottom && leftright === right) {
    //done
    let yPos = top + scrollTop;
    let xPos = left + linkWidth + 10 + scrollLeft;
    tooltipId.style.top = yPos + "px";
    tooltipId.style.left = xPos + "px";
  } else if (topbottom === bottom && leftright === left) {
    //done
    let yPos = top + scrollTop;
    let xPos = right + linkWidth + 10 + scrollLeft;
    tooltipId.style.top = yPos + "px";
    tooltipId.style.right = xPos + "px";
  } else if (topbottom === top && leftright === right) {
    //done
    let yPos = top - tooltiph - linkHeight / 2 + scrollTop;
    let xPos = left + linkWidth + 10 + scrollLeft;
    tooltipId.style.top = yPos + "px";
    tooltipId.style.left = xPos + "px";
  } else if (topbottom === top && leftright === left) {
    let yPos = top - tooltiph - linkHeight / 2 + scrollTop;
    let xPos = left - tooltipw - linkWidth + scrollLeft;
    tooltipId.style.top = yPos + "px";
    tooltipId.style.left = xPos + "px";
  }
}

function onError(err) {
  throw err;
}

document.ondblclick = function () {
  //determine language, english is default
  var chosenLanguage = browser.storage.sync.get("language");
  chosenLanguage.then(initializePopup, onError);
};

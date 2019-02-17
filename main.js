// beinhaltet Datenbank
let db;
// Diese Variable speichert ein einzelnes Lesezeichen Item
var savedBookmarkItem;
// Sobald komplettes HTML Dokument geladen hat (Ausnahme: Bilder evtl.) -> .js ausführen
window.onload = function()
{	
    // DESIGN VARIABLEN LADEN UND SETZEN
    // Prüfen, ob User zum Ersten mal auf dieser Seite ist, um Farben zu bestimmen
    if(localStorage.getItem("already-visited") === null)
    {
        // User zum ersten Mal da, also merken, dass er ab jetzt schon da war
        localStorage.setItem("already-visited", "true");
        // Erster Besuch -> Standardfarben
        localStorage.setItem("--main-color", "hsl(360, 58%, 35%)");
        localStorage.setItem("--hover-color", "hsl(355, 63%, 40%)");
        localStorage.setItem("--click-color", "hsl(5, 53%, 30%)");
        localStorage.setItem("--bg-first", "hsl(360, 10%, 90%)");
        localStorage.setItem("--bg-second", "hsl(15, 15%, 95%)");
    }

    // Farben laden und setzen
    loadAndSetColors();

    // SETUP DATABASE - IndexedDB
    // Datenbank öffnen (wird erstellt falls noch nicht existiert)
    let dbOpenRequest = window.indexedDB.open('bookmarks', 1);

    // Datenbank konnte nicht geöffnet werden
    dbOpenRequest.addEventListener("error", function(){ alert("Failed to load your bookmarks. Data may be corrupted. Please try again."); });

    // Datenbank erfolgreich geöffnet
    dbOpenRequest.addEventListener("success", function(){ 
        // Datenbankobjekt speichern
        db = dbOpenRequest.result;

        // Vorhandene Lesezeichen anzeigen
        displayBookmarks();
    });

    // Datenbanktabellen einrichten, falls noch nicht geschehen
    dbOpenRequest.addEventListener("upgradeneeded", function(event){
        // Geöffnete Datenbankreferenz speichern (genau wie oben, aber muss hier noch mal, da upgradeneeded vor success Event läuft)
        db = event.target.result;

        // objectStore erstellen (wie eine Tabelle)
        let objectStore = db.createObjectStore("bookmarks", { keyPath: "id", autoIncrement:true });

        // Tabellenspalten bestimmen
        objectStore.createIndex("title", "title", { unique: false });
        objectStore.createIndex("description", "description", { unique: false });
        objectStore.createIndex("url", "url", { unique: false });
        objectStore.createIndex("clicks", "clicks", { unique: false });
    });

    // Nachricht "Keine Lesezeichen" anzeigen, falls keine vorhanden
    

    // Modal Hintergrund + Container und Content-box
    var modalContainer = document.getElementsByClassName("background-modal")[0];
    var modalContent = document.getElementsByClassName("content-modal")[0];
    modalContent.addEventListener("animationend", function(){
        if(modalContent.style.getPropertyValue("animation-name") === "slideOutModal")
        {
            modalContainer.style.setProperty("display", "none");
        }
     });

    // ADD BOOKMARK BUTTON
    var btnAddBookmark = document.getElementsByName("add-btn")[0];
    btnAddBookmark.addEventListener("click", openAddBookmarkModal);

    // SETTINGS BUTTON
    var btnSettings = document.getElementsByName("settings-btn")[0];
    btnSettings.addEventListener("click", showSettingsDropdown);

    // Settings Dropdown reagiert auf Klicks (z. B. auf "Change Colors" Button)
    // versteckt sich, sobald fadeOut Animation vorbei ist
    var divSettingsDropdown = document.getElementsByClassName("settings-dropdown")[0];
    divSettingsDropdown.addEventListener("click", checkDropDownButtonClicked);
    divSettingsDropdown.addEventListener("animationend", function(){
        if(divSettingsDropdown.style.getPropertyValue("animation-name") === "dropdown-fadeOut")
        {
            divSettingsDropdown.style.setProperty("display", "none");
        }
    });

    // Klick irgendwo außerhalb des Dropdown Menüs schließt das DD Menü
    document.addEventListener("click", function(event) { 
        let ddMenu = document.getElementsByClassName("settings-dropdown")[0];
        if(event.target !== ddMenu.previousElementSibling)
        {
            ddMenu.style.setProperty("animation-name", "dropdown-fadeOut");
        }
    });
    
    // Wenn Lesezeichen angeklickt wird, prüfen, ob einer der Buttons im Lesezeichen geklickt wurde (Event Bubbling)
    var bookmarkItems = document.getElementsByClassName("bookmark-item");
    for (let i = 0; i < bookmarkItems.length; i++)
    {
        bookmarkItems[i].addEventListener("click", checkBookmarkItemButtonClicked);
    }

    // Prüft, ob ein Button im Lesezeichen geklickt wurde und verzweigt entsprechend
    function checkBookmarkItemButtonClicked(event)
    {
        // Trash Button
        if(event.target.name === "delete-btn")
        {
            openDeleteModal(event);
        }
        // Edit Button
        else if(event.target.name === "edit-btn")
        {
            openEditModal(event);
        }
        else if(event.target.name === "copy-btn")
        {
            copyBookmarkLink(event);
        }
        else if(event.target.name === "open-btn")
        {
            increaseClicksCounter(event);
        }
    }

    function checkDropDownButtonClicked(event)
    {
        // Change Colors Button
        if(event.target.name === "change-colors-btn")
        {
            openChangeColorsModal();
        }
        // Set Background Button
        else if(event.target.name === "set-background-btn")
        {
            openSetBackgroundModal();
        }
        // Import Button
        else if(event.target.name === "import-btn")
        {
            openImportModal();
        }
        // Import Button
        else if(event.target.name === "export-btn")
        {
            openExportModal();
        }
    }

    // PopUp (Modal): Farben anpassen
    function openChangeColorsModal()
    {
        clearModalContent(modalContent);

        appendModalHeading("Website Colors");

        var modalForm = document.createElement("form");

        // Bei Veränderung der Slider wird die Farbe aktualisiert
        modalForm.addEventListener("change", setColors);
        modalForm.addEventListener("input", setColors);

        // Hier sind alle Slider-Sektionen enthalten
        var inputContainer = document.createElement("div");
        inputContainer.setAttribute("class", "form-input-container-colors");

        // Hier sind alle Slider Elemente (Label, Input, Output) der Main Colors enthalten
        var mainColorsSectionContainer = document.createElement("div");
        mainColorsSectionContainer.setAttribute("class", "sliders-container");

        // Überschrift "Main Colors"
        var mainColorsHeading = document.createElement("h3");
        mainColorsHeading.innerText = "Main Colors";
        mainColorsHeading.style.setProperty("border-bottom", "1px solid lightgrey");
        mainColorsHeading.style.setProperty("margin-bottom", "10px");
        mainColorsSectionContainer.appendChild(mainColorsHeading);

        // HSL aus localStorage laden und einzelne Werte in Array extrahieren
        let mainColors = getValuesAsArray(localStorage.getItem("--main-color"));
        // Main Farben - Roter Slider
        appendNewColorSlider(mainColorsSectionContainer, "mainHue", "Hue", "outMainHue", 0, 360, mainColors[0]);
        // Main Farben - Grüner Slider
        appendNewColorSlider(mainColorsSectionContainer, "mainSaturation", "Saturation", "outMainSaturation", 5, 100, mainColors[1]);
        // Main Farben - Blauer Slider
        appendNewColorSlider(mainColorsSectionContainer, "mainLightness", "Lightness", "outMainLightness", 5, 85, mainColors[2]); // 85 Max, da 100 pures Weiß wäre (Design wäre broken)

        // Hier sind alle Slider Elemente (Label, Input, Output) der Background Colors enthalten
        var bgColorsSectionContainer = document.createElement("div");
        bgColorsSectionContainer.setAttribute("class", "sliders-container");

        // Überschrift "Background Colors"
        var bgColorsHeading = document.createElement("h3");
        bgColorsHeading.innerText = "Background Colors";
        bgColorsHeading.style.setProperty("border-bottom", "1px solid lightgrey");
        bgColorsHeading.style.setProperty("margin-bottom", "10px");
        bgColorsSectionContainer.appendChild(bgColorsHeading);

        // HSL aus localStorage laden und einzelne Werte in Array extrahieren
        let bgColors = getValuesAsArray(localStorage.getItem("--bg-first"));

        // Background Farbe - Roter Slider
        appendNewColorSlider(bgColorsSectionContainer, "bgHue", "Hue", "outBgHue", 0, 360, bgColors[0]);
        // Background Farbe - Grüner Slider
        appendNewColorSlider(bgColorsSectionContainer, "bgSaturation", "Saturation", "outBgSaturation", 0, 100, bgColors[1]);
        // Background Farbe - Blauer Slider
        appendNewColorSlider(bgColorsSectionContainer, "bgLightness", "Lightness", "outBgLightness", 0, 100, bgColors[2]);

        inputContainer.appendChild(mainColorsSectionContainer);
        inputContainer.appendChild(bgColorsSectionContainer);
        modalForm.appendChild(inputContainer);
        modalForm.appendChild(inputContainer);
        appendModalButtons(modalForm);
        // Cancel Button schließt nicht nur Modal, sondern lädt alte Farben aus dem Storage
        modalForm.querySelector("[name='cancel-btn']").addEventListener("click", function(){ loadAndSetColors(); });

        modalForm.getElementsByClassName("confirm-btn")[0].innerText = "Save"; // document.getElement... funktioniert nicht bei <form>.. kA why..
        // Form wird submitted (durch Klick auf Edit Button) -> Soll BookmarkItem editieren
        modalForm.addEventListener("submit", updateColorSettings);
        // Form (inkl. Buttons) zu Modal Content-Box hinzufügen!
        modalContent.appendChild(modalForm);

        showModal();
    }

    // Fügt einen neuen Slider mit Label und Output hinzu.
    // Parameter: Element zum appenden, ID für Slider, Label Text, Name für output
    function appendNewColorSlider(parentEle, id, lblText, outName, min, max, startValue)
    {
        var lbl = document.createElement("label");
        var input = document.createElement("input");
        var output = document.createElement("output");
        input.setAttribute("type", "range");
        input.setAttribute("min", min.toString());
        input.setAttribute("max", max.toString());
        input.setAttribute("id", id);
        input.setAttribute("value", startValue.toString());
        lbl.innerText = lblText;
        lbl.setAttribute("for", id);
        output.setAttribute("for", id);
        output.setAttribute("name", outName);
        output.innerText = input.value;
        if(max <= 100) output.innerText += "%"; // Hier handelt es sich wohl um einen %-Wert (Saturation, Lightness)
        parentEle.appendChild(lbl);
        parentEle.appendChild(input);
        parentEle.appendChild(output);
    }

    function setColors()
    {
        // Main Farbelemente
        var mainHueSlider = document.getElementById("mainHue");
        var mainHueOutput = document.getElementsByName("outMainHue")[0];
        var mainSaturationSlider = document.getElementById("mainSaturation");
        var mainSaturationOutput = document.getElementsByName("outMainSaturation")[0];
        var mainLightnessSlider = document.getElementById("mainLightness");
        var mainLightnessOutput = document.getElementsByName("outMainLightness")[0];

        // Background Farbelemente
        var bgHueSlider = document.getElementById("bgHue");
        var bgHueOutput = document.getElementsByName("outBgHue")[0];
        var bgSaturationSlider = document.getElementById("bgSaturation");
        var bgSaturationOutput = document.getElementsByName("outBgSaturation")[0];
        var bgLightnessSlider = document.getElementById("bgLightness");
        var bgLightnessOutput = document.getElementsByName("outBgLightness")[0];

        // Output Felder kriegen Value vom Slider
        mainHueOutput.value = mainHueSlider.value;
        mainSaturationOutput.value = mainSaturationSlider.value + "%";
        mainLightnessOutput.value = mainLightnessSlider.value + "%";
        bgHueOutput.value = bgHueSlider.value;
        bgSaturationOutput.value = bgSaturationSlider.value + "%";
        bgLightnessOutput.value = bgLightnessSlider.value + "%";

        // Main Colors Farben anpassen
        var sHSL = "hsl(" + mainHueSlider.value + "," + mainSaturationSlider.value + "%," + mainLightnessSlider.value + "%)";
        document.documentElement.style.setProperty("--main-color", sHSL);

        // Main Colors "Hover" Farben anpassen
        var hueHover = Number(mainHueSlider.value) - 5;
        // Hue ist kleiner 0 -> wieder bei 360 anfangen und den Rest subtrahieren (Bsp: Hue: 5, 5 - 15 = -10, also 360 - 10 ist neuer Hue)
        if(hueHover < 0) hueHover = 360 - Math.abs(hueHover);
        var saturationHover = Math.min(100, Number(mainSaturationSlider.value) + 5);
        var lightnessHover = Math.min(100, Number(mainLightnessSlider.value) + 5);
        var sHSLHover = "hsl(" + hueHover + "," + saturationHover + "%," + lightnessHover + "%)";
        // document.documentElement.style bezieht sich auf die :root Pseudo-Klasse
        document.documentElement.style.setProperty("--hover-color", sHSLHover);

        // Main Colors "Click" Farben anpassen
        var hueClick = Number(mainHueSlider.value) + 5;
        // Hue ist größer als 360 -> das gleiche wie oben machen, nur umgedreht
        if(hueClick > 360) hueClick = 0 + (hueClick - 360);
        var saturationClick = Math.max(0, Number(mainSaturationSlider.value) - 5);
        var lightnessClick = Math.max(0, Number(mainLightnessSlider.value) - 5);
        var sHSLClick = "hsl(" + hueClick + "," + saturationClick + "%," + lightnessClick + "%)";
        document.documentElement.style.setProperty("--click-color", sHSLClick);

        // Bg Colors Farben anpassen
        // --bg-first
        var sBgHSLFirst = "hsl(" + bgHueSlider.value + "," + bgSaturationSlider.value + "%," + bgLightnessSlider.value + "%)";
        document.documentElement.style.setProperty("--bg-first", sBgHSLFirst);

        // --bg-second
        var bgSecondHue = Number(bgHueSlider.value) + 15;
        if(bgSecondHue > 360) bgSecondHue = 0 + (bgSecondHue - 360);
        var bgSecondSaturation = Math.min(100, Number(bgSaturationSlider.value) + 5);
        var bgSecondLightness = Math.min(100, Number(bgLightnessSlider.value) + 5);
        var sBgHSLSecond = "hsl(" + bgSecondHue + "," + bgSecondSaturation + "%," + bgSecondLightness + "%)";
        document.documentElement.style.setProperty("--bg-second", sBgHSLSecond);
    }

    // Speicher Farbeinstellungen im localStorage
    function updateColorSettings(event)
    {
        event.preventDefault();
        localStorage.setItem("--main-color", document.documentElement.style.getPropertyValue("--main-color"));
        localStorage.setItem("--hover-color", document.documentElement.style.getPropertyValue("--hover-color"));
        localStorage.setItem("--click-color", document.documentElement.style.getPropertyValue("--click-color"));
        localStorage.setItem("--bg-first", document.documentElement.style.getPropertyValue("--bg-first"));
        localStorage.setItem("--bg-second", document.documentElement.style.getPropertyValue("--bg-second"));

        hideModal();
    }

    function loadAndSetColors()
    {
        document.documentElement.style.setProperty("--main-color", localStorage.getItem("--main-color"));
        document.documentElement.style.setProperty("--hover-color", localStorage.getItem("--hover-color"));
        document.documentElement.style.setProperty("--click-color", localStorage.getItem("--click-color"));
        document.documentElement.style.setProperty("--bg-first", localStorage.getItem("--bg-first"));
        document.documentElement.style.setProperty("--bg-second", localStorage.getItem("--bg-second"));
    }

    // PopUp (Modal): "Lesezeichen löschen?"
    function openDeleteModal(event)
    {
        clearModalContent(modalContent);

        // ausgewähltes Lesezeichen speichern (damit bei "Confirm" gelöscht werden kann)
        savedBookmarkItem = event.target.parentNode.parentNode;

		// Modal Text hinzufügen
        var bookmarkName = savedBookmarkItem.getElementsByTagName("h3")[0].innerText;
        var modalText = document.createElement("p");
        modalText.setAttribute("class", "content-modal-text");
        modalText.innerHTML = "Bookmark <b>" + bookmarkName + "</b> is going to be deleted.<br>Confirm?";
        modalContent.appendChild(modalText);
        
        appendModalButtons(modalContent);
        // Delete Button soll deleteBookmarkItem auslösen
        modalContent.getElementsByClassName("confirm-btn")[0].addEventListener("click", deleteBookmarkItem);
        modalContent.getElementsByClassName("confirm-btn")[0].innerText = "Delete";

        showModal();
    }
    
    // Lesezeichen löschen
    function deleteBookmarkItem()
    {
        let itemId = Number(savedBookmarkItem.getAttribute("data-item-id"));

        // Datenbanktransaktion, itemId suchen und löschen
        let transaction = db.transaction(["bookmarks"], "readwrite");
        let objectStore = transaction.objectStore("bookmarks");
        let deleteItemRequest = objectStore.delete(itemId);

        // Transaktion fertig -> aus bookmark-section löschen
        transaction.addEventListener("complete", function(){
            savedBookmarkItem.remove();

            // "Keine Lesezeichen" Nachricht, falls keine vorhanden
            checkToShowEmptyMessage();
        });
        hideModal();
    }

    // PopUp (Modal): Lesezeichen editieren?
    function openEditModal(event)
    {
        clearModalContent(modalContent);

        // ausgewähltes Lesezeichen speichern (damit bei "Edit" editiert werden kann)
        savedBookmarkItem = event.target.parentNode.parentNode;

        // Überschrift Modal
        appendModalHeading("Edit Bookmark");

        // Form - Enthält Inputs und Buttons
        var modalForm = document.createElement("form");
        var inputContainer = document.createElement("div");
        inputContainer.setAttribute("class", "form-input-container");

        /* EDIT BOOKMARK INPUT FORM */
        // Label + Input Bookmark name
        var lbl = document.createElement("label");
        var input = document.createElement("input");
        input.setAttribute("type", "text");
        input.setAttribute("maxlength", "18");
        input.required = true;
        input.value = savedBookmarkItem.getElementsByTagName("h3")[0].innerText;
        lbl.style.margin = "0 20px 30px 20px";
        lbl.innerText = "Name (max. 18 characters)";
        lbl.appendChild(document.createElement("br"));
        lbl.appendChild(input);
        inputContainer.appendChild(lbl);

        // Label + Input Description
        lbl = document.createElement("label");
        input = document.createElement("input");
        input.setAttribute("type", "text");
        input.setAttribute("maxlength", "90");
        input.value = savedBookmarkItem.getElementsByClassName("item-description-text")[0].innerText;
        lbl.style.margin = "0 20px 30px 20px";
        lbl.innerText = "Description (max. 90 characters)";
        lbl.appendChild(document.createElement("br"));
        lbl.appendChild(input);
        inputContainer.appendChild(lbl);
        
        // Label + Input URL
        lbl = document.createElement("label");
        input = document.createElement("input");
        input.setAttribute("type", "url");
        input.required = true;
        input.value = savedBookmarkItem.getElementsByTagName("a")[0].getAttribute("href");
        lbl.style.margin = "0 20px 30px 20px";
        lbl.innerText = "URL (Link)";
        lbl.appendChild(document.createElement("br"));
        lbl.appendChild(input);
        inputContainer.appendChild(lbl);

        // inputContainer hat Inhalt (Labels + Inputs) -> zur Form hinzufügen
        modalForm.appendChild(inputContainer);

        appendModalButtons(modalForm);
        modalForm.getElementsByClassName("confirm-btn")[0].innerText = "Edit"; // document.getElement... funktioniert nicht bei <form>.. kA why..

        // Form wird submitted (durch Klick auf Edit Button) -> Soll BookmarkItem editieren
        modalForm.addEventListener("submit", editBookmarkItem);
        // Form (inkl. Buttons) zu Modal Content-Box hinzufügen!
        modalContent.appendChild(modalForm);

        showModal();
    }

    // Lesezeichen: Änderungen übernehmen
    function editBookmarkItem(event)
    {
        // Form soll nicht Standardreaktion auslösen (POST)
        event.preventDefault();
        var inputContainerNode = event.target.firstElementChild;
        
        // alle Input Elemente aus Input-Container raussuchen
        var lblName = inputContainerNode.firstElementChild.lastElementChild;
        var lblDescription = lblName.parentNode.nextElementSibling.lastElementChild;
        var lblLink = lblDescription.parentNode.nextElementSibling.lastElementChild;

        // Setze die eingegebenen Daten ein (Name, Beschreibung, Link);
        savedBookmarkItem.getElementsByTagName("h3")[0].innerText = lblName.value;
        savedBookmarkItem.getElementsByClassName("item-description-text")[0].innerText = lblDescription.value;
        savedBookmarkItem.getElementsByTagName("a")[0].setAttribute("href", lblLink.value);

        // Bookmark zur Datenbank hinzufügen
        let bookmarkObject = { title: lblName.value, description: lblDescription.value, url: lblLink.value };
        // read/write Transaktion öffnen
        let transaction = db.transaction(["bookmarks"], "readwrite");

        // Tabelle (object store) aufrufen
        let objectStore = transaction.objectStore("bookmarks");
        objectStore.openCursor().addEventListener("success", function(event){
            var cursor = event.target.result;
            if(cursor)
            {
                // Eintrag updaten
                if(cursor.primaryKey === Number(savedBookmarkItem.getAttribute("data-item-id")))
                {
                    let updatedObject = cursor.value;
                    updatedObject.title = bookmarkObject.title;
                    updatedObject.description = bookmarkObject.description;
                    updatedObject.url = bookmarkObject.url;

                    cursor.update(updatedObject);   
                }
                else
                {
                    cursor.continue();
                }
            }
        });

        hideModal();
    }

    function openAddBookmarkModal(event)
    {
        clearModalContent(modalContent);

        // Überschrift Modal
        appendModalHeading("Add Bookmark")

        // Form - Enthält Inputs und Buttons
        var modalForm = document.createElement("form");
        var inputContainer = document.createElement("div");
        inputContainer.setAttribute("class", "form-input-container");

        /* ADD BOOKMARK INPUT FORM */
        // Label + Input Bookmark name
        var lbl = document.createElement("label");
        var input = document.createElement("input");
        input.setAttribute("type", "text");
        input.setAttribute("maxlength", "18");
        input.required = true;
        lbl.style.margin = "0 20px 30px 20px";
        lbl.innerText = "Name (max. 18 characters)";
        lbl.appendChild(document.createElement("br"));
        lbl.appendChild(input);
        inputContainer.appendChild(lbl);

        // Label + Input Description
        lbl = document.createElement("label");
        input = document.createElement("input");
        input.setAttribute("type", "text");
        input.setAttribute("maxlength", "90");
        lbl.style.margin = "0 20px 30px 20px";
        lbl.innerText = "Description (max. 90 characters)";
        lbl.appendChild(document.createElement("br"));
        lbl.appendChild(input);
        inputContainer.appendChild(lbl);
        
        // Label + Input URL
        lbl = document.createElement("label");
        input = document.createElement("input");
        lbl.style.margin = "0 20px 30px 20px";
        input.setAttribute("type", "url");
        input.setAttribute("placeholder", "https://www.example.com");
        input.required = true;
        lbl.innerText = "URL (Link)";
        lbl.appendChild(document.createElement("br"));
        lbl.appendChild(input);
        inputContainer.appendChild(lbl);

        // inputContainer hat Inhalt (Labels + Inputs) -> zur Form hinzufügen
        modalForm.appendChild(inputContainer);
        
        appendModalButtons(modalForm);
        modalForm.getElementsByClassName("confirm-btn")[0].innerText = "Add"; // document.getElement... funktioniert nicht bei <form>.. kA why..

        // Form wird submitted (durch Klick auf Add Button) -> Soll BookmarkItem hinzufügen
        modalForm.addEventListener("submit", addBookmarkItem);
        // Form (inkl. Buttons) zu Modal Content hinzufügen!
        modalContent.appendChild(modalForm);

        showModal();
    }

    function addBookmarkItem(event)
    {
        // Form soll nicht Standardreaktion auslösen (POST)
        event.preventDefault();
        var inputContainerNode = event.target.firstElementChild;
        
        // alle Input Elemente aus Input-Container raussuchen
        var lblName = inputContainerNode.firstElementChild.lastElementChild;
        var lblDescription = lblName.parentNode.nextElementSibling.lastElementChild;
        var lblLink = lblDescription.parentNode.nextElementSibling.lastElementChild;

        // Setze die eingegebenen Daten ein (Name, Beschreibung, Link);
        var bookmarkItem = appendEmptyBookmarkItem();
        bookmarkItem.getElementsByTagName("h3")[0].innerText = lblName.value;
        bookmarkItem.getElementsByClassName("item-description-text")[0].innerText = lblDescription.value;
        bookmarkItem.getElementsByTagName("a")[0].setAttribute("href", lblLink.value);

        // Bookmark hinzufügen!
        var bookmarkSection = document.getElementsByClassName("bookmark-section")[0];
        bookmarkSection.appendChild(bookmarkItem);

        // Bookmark zur Datenbank hinzufügen
        let bookmarkObject = { title: lblName.value, description: lblDescription.value, url: lblLink.value, clicks: 0 };

        // read/write Transaktion öffnen
        let transaction = db.transaction(["bookmarks"], "readwrite");

        // Tabelle (object store) aufrufen
        let objectStore = transaction.objectStore("bookmarks");

        // Request: Lesezeichen in Tabelle schreiben
        var addItemRequest = objectStore.add(bookmarkObject);

        transaction.addEventListener("complete", function(){ 
            displayBookmarks();
        });

        hideModal();
    }

    // Link in die Zwischenablage kopieren und bei Erfolg bzw. Misserfolg mitteilen
    function copyBookmarkLink(event)
    {
        // Text-Animation mit "Copied"-Text, Element wird am Ende der Animation gelöscht
        var itemTopRow = event.target.parentNode;
        var spanCopiedHint = document.createElement("span");
        spanCopiedHint.setAttribute("class", "copied-hint");
        spanCopiedHint.innerText = "Copied";
        spanCopiedHint.addEventListener("animationend", function(event){ event.target.remove(); });
        itemTopRow.insertBefore(spanCopiedHint, event.target);

        // Temporär Textarea erstellen, Link reinlegen, diesen Link in Zwischenablage kopieren
        var bookmarkLink = event.target.parentNode.parentNode.getElementsByTagName("a")[0].getAttribute("href");
        var txtAreaTemp = document.createElement("textarea");
        txtAreaTemp.value = bookmarkLink;
        document.body.insertBefore(txtAreaTemp, document.body.firstElementChild);
        txtAreaTemp.select();
        document.execCommand("copy");
        document.body.removeChild(txtAreaTemp);
    }

    function displayBookmarks()
    {
        let bookmarkSection = document.getElementsByClassName("bookmark-section")[0];
        // Erst mal alles leeren
        while (bookmarkSection.firstElementChild)
        {
            bookmarkSection.removeChild(bookmarkSection.firstElementChild);
        }

        // Tabelle öffnen und Cursor holen
        let objectStore = db.transaction("bookmarks").objectStore("bookmarks");
        objectStore.openCursor().addEventListener("success", function(event){
            // Cursor holen
            let cursor = event.target.result;

            // Wenn da noch ein Bookmark ist, weitermachen
            if(cursor)
            {
                var bookmarkItem = appendEmptyBookmarkItem();
                bookmarkItem.getElementsByTagName("h3")[0].innerText = cursor.value.title;
                bookmarkItem.getElementsByClassName("item-description-text")[0].innerText = cursor.value.description;
                bookmarkItem.getElementsByTagName("a")[0].setAttribute("href", cursor.value.url);
                bookmarkItem.getElementsByClassName("item-top-row")[0].firstElementChild.firstElementChild.innerText = " " + cursor.value.clicks;
                bookmarkItem.setAttribute("data-item-id", cursor.value.id);
                bookmarkSection.appendChild(bookmarkItem);

                cursor.continue();
            }
            else
            {
                // "Keine Lesezeichen" Nachricht anzeigen oder verstecken, je nachdem, ob Lesezeichen vorhanden sind
                checkToShowEmptyMessage();
                checkToHideEmptyMessage();
            }
        });
    }

    // "Open" Button wurde angeklickt -> Clicks Counter erhöhen
    function increaseClicksCounter(event)
    {
        let bookmarkItem = event.target.parentNode.parentNode.parentNode;
        // read/write Transaktion öffnen
        let transaction = db.transaction(["bookmarks"], "readwrite");

        // Tabelle (object store) aufrufen
        let objectStore = transaction.objectStore("bookmarks");
        objectStore.openCursor().addEventListener("success", function(event){
            var cursor = event.target.result;
            if(cursor)
            {
                // Eintrag updaten (Clicks erhöhen)
                if(cursor.primaryKey === Number(bookmarkItem.getAttribute("data-item-id")))
                {
                    let updatedObject = cursor.value;
                    updatedObject.clicks += 1;
                    bookmarkItem.getElementsByClassName("item-top-row")[0].firstElementChild.firstElementChild.innerText = " " + updatedObject.clicks;

                    cursor.update(updatedObject);
                }
                else
                {
                    cursor.continue();
                }
            }
        });
    }

    function showSettingsDropdown()
    {
        let ddMenu = document.getElementsByClassName("settings-dropdown")[0];
        ddMenu.style.setProperty("display", "block");
        ddMenu.style.setProperty("animation-name", "dropdown-fadeIn");
    }

    // Erstellt BookmarkItem ohne Daten (name, beschreibung, link)
    function appendEmptyBookmarkItem()
    {
        // Parent-Bausteine
        var bookmarkItemContainer = document.createElement("div");
        var itemTopRow = document.createElement("div");
        var bookmarkTitle = document.createElement("h3");
        var itemDescriptionContainer = document.createElement("div");
        var itemButtonContainer = document.createElement("div");

        // Children-Bausteine
        // << for Item Top Row >>
        var spanClicksIcon = document.createElement("span");
        var spanClicksText = document.createElement("span");
        var btnCopy = document.createElement("button");
        var btnEdit = document.createElement("button");
        var btnDelete = document.createElement("button");
        // << for Item Description Container >>
        var itemDescriptionText = document.createElement("p");
        // << for Item Button Container >>
        var btnOpenLink = document.createElement("a");
        var btnOpen = document.createElement("button");

        // Alle Attribute/Texte setzen
        // << Container >>
        bookmarkItemContainer.setAttribute("class", "bookmark-item");
        itemButtonContainer.setAttribute("class", "item-btn-container");
        // << Item Top Row >>
        itemTopRow.setAttribute("class", "item-top-row");
        spanClicksIcon.setAttribute("class", "fas fa-mouse-pointer");
        btnCopy.setAttribute("name", "copy-btn");
        btnCopy.setAttribute("class", "btn far fa-copy copy-btn flex-item-push-right");
        btnEdit.setAttribute("name", "edit-btn");
        btnEdit.setAttribute("class", "btn edit-btn far fa-edit");
        btnDelete.setAttribute("name", "delete-btn");
        btnDelete.setAttribute("class", "btn delete-btn far fa-trash-alt");
        // << Item Description >>
        itemDescriptionContainer.setAttribute("class", "item-description");
        itemDescriptionText.setAttribute("class", "item-description-text");
        // << Item Buttons >>    
        btnOpenLink.setAttribute("target", "_blank");
        btnOpen.setAttribute("name", "open-btn");
        btnOpen.setAttribute("class", "btn item-btn important-btn fas fa-angle-double-right");

        // Children zu Parents hinzufügen
        spanClicksIcon.appendChild(spanClicksText);
        itemTopRow.appendChild(spanClicksIcon);
        itemTopRow.appendChild(btnCopy);
        itemTopRow.appendChild(btnEdit);
        itemTopRow.appendChild(btnDelete);
        bookmarkItemContainer.appendChild(itemTopRow);
        bookmarkItemContainer.appendChild(bookmarkTitle);
        itemDescriptionContainer.appendChild(itemDescriptionText);
        bookmarkItemContainer.appendChild(itemDescriptionContainer);
        btnOpenLink.appendChild(btnOpen);
        itemButtonContainer.appendChild(btnOpenLink);
        bookmarkItemContainer.appendChild(itemButtonContainer);

        bookmarkItemContainer.addEventListener("click", checkBookmarkItemButtonClicked);

        return bookmarkItemContainer;
    }

    // Cleared modal Box komplett
    function clearModalContent(modalContent)
    {
        while(modalContent.firstElementChild)
        {
            modalContent.firstElementChild.remove();
        }
    }

    // Fügt Modal Buttons in Modal hinzu (Confirm Button und Cancel Button)
    function appendModalButtons(node)
    {
        var buttonContainer = document.createElement("div");
        buttonContainer.setAttribute("class", "btn-modal-container");
        
        var btnConfirm = document.createElement("button");
        btnConfirm.setAttribute("class", "btn important-btn confirm-btn");
        btnConfirm.style.setProperty("min-width", "70px");
        btnConfirm.innerText = "Confirm";
        var btnCancel = document.createElement("button");
        btnCancel.setAttribute("class", "btn nav-btn");
        btnCancel.setAttribute("type", "button");
        btnCancel.setAttribute("name", "cancel-btn");
        btnCancel.innerText = "Cancel";
        // Button Cancel versteckt Modal bei Click (Standard für jedes Modal)
        btnCancel.addEventListener("click", function(){
            hideModal();
        });

        buttonContainer.appendChild(btnConfirm);
        buttonContainer.appendChild(btnCancel);
        node.appendChild(buttonContainer);
    }

    // Modal verstecken (mit Animation)
    function hideModal()
    {
        modalContent.style.setProperty("animation-name", "slideOutModal");
        modalContainer.style.setProperty("animation-name", "fadeOutModalBackground");
    }

    // Modal anzeigen (mit Animation)
    function showModal()
    {
        modalContainer.style.setProperty("display", "block");
        modalContainer.style.setProperty("animation-name", "fadeInModalBackground");
        modalContent.style.setProperty("animation-name", "slideInModal");
    }

    function appendModalHeading(text)
    {
        var modalHeading = document.createElement("h2");
        modalHeading.innerText = text;
        modalHeading.setAttribute("class", "heading-modal");
        modalContent.appendChild(modalHeading);
    }

    // Prüft, ob "Mitteilung - Keine Lesezeichen vorhanden" angezeigt werden soll
    function checkToShowEmptyMessage()
    {
        if(document.getElementsByClassName("bookmark-section")[0].firstElementChild === null)
        {
            let emptyMessageContainer = document.getElementsByClassName("empty-message-container")[0];
            emptyMessageContainer.style.setProperty("display", "inline-block");
        }
    }

    function checkToHideEmptyMessage()
    {
        if(document.getElementsByClassName("bookmark-section")[0].firstElementChild !== null)
        {
            let emptyMessageContainer = document.getElementsByClassName("empty-message-container")[0];
            emptyMessageContainer.style.setProperty("display", "none");
        }
    }

    // Extrahiert alle Werte aus einem String in ein Array
    function getValuesAsArray(stringWithValues)
    {
        //bsp: hsl(230, 40%, 5%);
        let arrayValues = [];
        let filteredNumber = "";
        for(let i = 0; i < stringWithValues.length; i++)
        {
            // Stelle i beinhaltet eine Zahl
            if(!isNaN(parseInt(stringWithValues[i])))
            {
                // Zahl als String zwischenspeichern
                filteredNumber += stringWithValues[i];
            }
            // Stelle i beinhaltet KEINE Zahl und es wurde bereits eine Zahl rausgefiltert
            else if(filteredNumber !== "")
            {
                // Neuer Wert in's Array und zurücksetzen
                arrayValues.push(parseInt(filteredNumber));
                filteredNumber = "";
            }
        }
        
        return arrayValues;
    }
};
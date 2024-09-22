const converter = new showdown.Converter()

var rssDoc = document.implementation.createDocument("", "", null);

function attribute(aname, avalue, namespaceUri) {
    let a;
    if (namespaceUri === undefined){
        a = rssDoc.createAttribute(aname);
    }
    else {
        a = rssDoc.createAttributeNS(namespaceUri, aname);
    }
    a.value = avalue;
    return a;
};

function appendChildElement(parent, ename, eapply, namespaceUri) {
    let e;
    if (namespaceUri === undefined){
        e = rssDoc.createElement(ename);
    }
    else {
        e = rssDoc.createElementNS(namespaceUri, ename);
    }
    if (eapply !== undefined){
        eapply(e);
    }
    parent.appendChild(e);
    return e;
};

function addCDATA(parent, string) {
    parent.appendChild(rssDoc.createCDATASection(string));
}

function serialize(toSerialize) {
    let serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(toSerialize); // Doesn't indent

    try {
        console.log(`before format: ${xmlString}`);
        let format = require('xml-formatter');
        xmlString = format(xmlString, {
            indentation: '  ',
            lineSeparator: '\n',
            throwOnFailure: false,

        });
        console.log(`after format: ${xmlString}`);
        return xmlString;
    }
    catch {
        return xmlString
    }
}

function saveFeed(toSave, filename) {
    let xmlText = serialize(toSave);
    localStorage.setItem("rssfeed", xmlText)
    localStorage.setItem("filename", filename)
    xmlFile = new Blob([xmlText], { type: 'text/xml' })
    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(xmlFile);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
}

function populateElementFromForm(item){
    appendChildElement(item, "title", e => addCDATA(e, postTitle));
    appendChildElement(item, "pubDate", e => addCDATA(e, pubDate));
    appendChildElement(item, "description", e => addCDATA(e, postBody));
    appendChildElement(item, "author", e => addCDATA(e, postAuthor));
    if (isLink){
        appendChildElement(item, "link", e => addCDATA(e, postLink));
        appendChildElement(item, "guid", e => addCDATA(e, postLink));
    } else {
        appendChildElement(item, "guid", e => {
            e.setAttributeNode(attribute("isPermaLink", false));
            addCDATA(e, crypto.randomUUID());
        });
    }
}

function generateNewFeed() {
    const rawForm = document.querySelector("#newxml")
    const data = Object.fromEntries(new FormData(rawForm))
    rssTitle = data.rsstitle
    rssLink = data.rsslink
    rssDescription = data.rssdescription
    postTitle = data.title
    postAuthor = data.author
    postLink = data.link
    isLink = postLink !== ''
    pubDate = new Date(Date.parse(data.pubdate)).toUTCString()
    postBody = converter.makeHtml(data.post)

    // Replace document with an empty one.
    rssDoc = document.implementation.createDocument("", "", null);

    // Scaffold the feed
    let root = appendChildElement(rssDoc, "rss", e => {
        e.setAttributeNode(attribute("version", "2.0"));
        e.setAttributeNode(attribute("xmlns:atom", "http://www.w3.org/2005/Atom"));
    });
    let processingInstruction = rssDoc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"');
    rssDoc.insertBefore(processingInstruction, rssDoc.firstChild);
    let channel = appendChildElement(root, "channel");

    appendChildElement(channel, "title", e => addCDATA(e, rssTitle));
    appendChildElement(channel, "atom:link", e => {
        e.setAttributeNode(attribute("href", `${rssLink}/rss.xml`));
        e.setAttributeNode(attribute("rel", "self"));
        e.setAttributeNode(attribute("type", "application/rss+xml"));
    });
    appendChildElement(channel, "link", e => addCDATA(e, rssLink));
    appendChildElement(channel, "description", e => addCDATA(e, rssDescription));

    appendChildElement(channel, "item", populateElementFromForm);

    saveFeed(rssDoc, 'rss.xml');
}

async function readRssFile(f) {
    let inputFileContents = await new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.onerror = (e) => {
            reject(e);
        };
        reader.readAsText(f);
    });

    let parser = new DOMParser();
    let rssDoc = parser.parseFromString(inputFileContents, "text/xml");

    return rssDoc;
}

async function appendPost() {
    const rawForm = document.querySelector("#addpost")
    const data = Object.fromEntries(new FormData(rawForm))
    rawFeed = data.rssfeed
    postTitle = data.title
    postAuthor = data.author
    postLink = data.link
    isLink = postLink !== ''
    pubDate = new Date(Date.parse(data.pubdate)).toUTCString()
    postBody = converter.makeHtml(data.post)

    // Read the rss document that was uploaded
    let rssDoc = await readRssFile(rawFeed)

    // Find the first item in the channel and add one before it.
    let channel = rssDoc.querySelector("channel");
    if (!channel) {
        throw new Error("Uploaded feed didn't contain a 'channel' element.")
    }
    let existingFirstItem = channel.querySelector("item");
    if (!existingFirstItem){
        throw new Error("Uploaded feed didn't contain any items.");
    }

    let newFirstItem = rssDoc.createElement("item");
    populateElementFromForm(newFirstItem);
    channel.insertBefore(newFirstItem, existingFirstItem);

    saveFeed(rssDoc, rawFeed.name);
}

function previewText(textBox, previewBox, htmlBox) {
    input = document.getElementById(textBox)
    output1 = document.getElementById(previewBox)
    output2 = document.getElementById(htmlBox)
    inputHtml = converter.makeHtml(input.value)
    output1.innerHTML = inputHtml
    output2.innerText = inputHtml
}

function checkLocalStorage(){
    const rssFeed = localStorage.getItem("rssfeed")
    const fileName = localStorage.getItem("filename")
    const file = document.getElementById("rssfeedadd")
    if(rssFeed !== null && fileName !== null && file.files.length === 0){
        const rssFile = new File([rssFeed], fileName)
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(rssFile)
        file.files = dataTransfer.files
    }
}

async function setFileName(){
    const fileElement = document.getElementById("rssfeedadd")
    const filenameSpace = document.getElementById("filename")
    if(fileElement.files.length !== 0){
        let file = fileElement.files[0]
        filenameSpace.innerText = file.name
        
        // Attempt to read the file, get the author from the most recent item, and populate the form with it.
        try {
            let uploadedRssDoc = await readRssFile(file);
            let existingFirstItem = uploadedRssDoc.querySelector("item");
            if (existingFirstItem) {
                let existingAuthor = existingFirstItem.querySelector("author");
                if (existingAuthor){
                    document.getElementById("authoradd").value = existingAuthor.textContent.trim();
                }
            }
        }
        catch (e) {
            console.log(`Failed to set author name from uploaded feed: ${e}`)
        }
    }
}
var converter = new showdown.Converter()

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
    xmlText = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel><title>${rssTitle}</title>
    <atom:link href="${rssLink}/rss.xml" rel="self" type="application/rss+xml" />
    <link>${rssLink}</link>
    <description>${rssDescription}</description>
    <item>
    <title>${postTitle}</title>
    <pubDate>${pubDate}</pubDate>
    <description><![CDATA[${postBody}]]></description>
    <author>${postAuthor}</author>${isLink ? `
        <link>${postLink}</link>` : ''}
    <guid${isLink ? '' : ' isPermaLink="false" '}>${isLink ? postLink : crypto.randomUUID()}</guid>
    </item>
    </channel>
    </rss>`
    xmlFile = new Blob([xmlText], { type: 'text/xml' })
    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(xmlFile);
    elem.download = 'rss.xml';
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
}

function appendPost() {
    const rawForm = document.querySelector("#addpost")
    const data = Object.fromEntries(new FormData(rawForm))
    rawFeed = data.rssfeed
    postTitle = data.title
    postAuthor = data.author
    postLink = data.link
    isLink = postLink !== ''
    pubDate = new Date(Date.parse(data.pubdate)).toUTCString()
    postBody = converter.makeHtml(data.post)
    let rssFeed
    const reader = new FileReader()
    reader.onload = (e) => {
        rssFeed = e.target.result
        startIndex = rssFeed.indexOf("<item>")
        newPostText = `<item>
        <title>${postTitle}</title>
        <pubDate>${pubDate}</pubDate>
        <description><![CDATA[${postBody}]]></description>
        <author>${postAuthor}</author>${isLink ? `
            <link>${postLink}</link>` : ''}
        <guid${isLink ? '' : ' isPermaLink="false" '}>${isLink ? postLink : crypto.randomUUID()}</guid>
        </item>
        `
        preEntry = rssFeed.slice(0, startIndex)
        postEntry = rssFeed.slice(startIndex)
        xmlText = preEntry + newPostText + postEntry
        xmlFile = new Blob([xmlText], { type: 'text/xml' })
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(xmlFile);
        elem.download = rawFeed.name;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
    reader.readAsText(rawFeed)
}

function previewText(textBox, previewBox, htmlBox) {
    input = document.getElementById(textBox)
    output1 = document.getElementById(previewBox)
    output2 = document.getElementById(htmlBox)
    inputHtml = converter.makeHtml(input.value)
    output1.innerHTML = inputHtml
    output2.innerText = inputHtml
}

function setFileName(){
    const file = document.getElementById("rssfeedadd")
    const filenameSpace = document.getElementById("filename")
    filenameSpace.innerText = file.files[0].name
}
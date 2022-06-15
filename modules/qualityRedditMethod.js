require("dotenv").config();
const prompt = require("prompt-sync")(); // A sync prompt for node. very simple. no C++ bindings and no bash scripts. 
const snoowrap = require("snoowrap"); // fully-featured JavaScript wrapper that provides a simple interface to access every reddit API endpoint
const fs = require("fs"); // provides a lot of very useful functionality to access and interact with the file system
const dayjs = require("dayjs"); // JavaScript date library for parsing, validating, manipulating, and formatting dates  
const json2csv = require("json2csv"); // convert json to csv 

const redditFetch = new snoowrap({ // Pass in a username and password for script-type apps.
    userAgent: process.env.USER_AGENT, // A user agent header is a string of text that is sent with HTTP requests to identify the program making the request (the program is called a "user agent"). Web browsers commonly send these in order to identify themselves (so the server can tell if you"re using Chrome or Firefox, for example).
    clientId: process.env.CLIENT_ID, // client id needed to access Reddit’s API as a script application
    clientSecret: process.env.CLIENT_SECRET, // client secret needed to access Reddit’s API as a script application
    username: process.env.USER_NAME, // my reddit username 
    password: process.env.PASS_WORD // my reddit password
});

redditFetch.config({ requestDelay: 10000}); // delay request to 10 seconds   

/*
    the key thing here is pushComments(comments, arr, stream), which loops through every comment of comments and:

    - creates results and pushes it to arr
    - converts results to csv format and writes it to stream
    - and most importantly, calls itself for comment.replies
*/

async function pushComments (comments, arr, stream) {
    for (let comment of comments) {
        if (post.comments[tempIndex].author.name === "AutoModerator" || post.comments[tempIndex].author.name === "[removed]" || post.comments[tempIndex].author.name === "[deleted]") continue; //authors who are "AutoModerator" bots, author comments that have been removed, or authors who deleted comments will be ignored
        
        const results = { 
            "SUBREDDIT NAME": comment.subreddit.display_name, // displayed name of subreddit
            "USER NAME": comment.author.name,   // displayed reddit username of author 
            "COMMENT ID": comment.name, // comment id
            "COMMENT PERMALINK": `https://reddit.com${comment.permalink}`,
            "COMMENT CREATED": dayjs(comment.created_utc * 1000).format("YYYY-DD-MM h:mm:ss A"), // the date the comment was created in this format: 2021-09-07 11:41:00 PM
            "COMMENT TEXT": comment.body, // comment body
            "COMMENT UPVOTES": comment.score // amount of upvotes on comment 
        };

        arr.push(results);
        await stream.write(json2csv.parse(results));

        if (comment.replies.length > 0) {
            await pushComments(comment.replies, arr, stream);
        }
    }
}

async function scrapeSubreddit() {   
    let data = [];      

    const redditPostID = prompt("Enter your subreddit post ID: ");
    const thread = await redditFetch.getSubmission(redditPostID).expandReplies().catch({statusCode: 429}, function() {}); // get random post from subreddit and catch error 429 just in case

    const stream = fs.createWriteStream(`qualityRedditComments.csv`, { "flags": "a", "encoding": "utf-8"}); // "a" flag opens the file for writing, positioning the stream at the end of the file. The file is created if it does not exist

    await pushComments(thread.comments, data, stream)
    console.log(`... Done. Successfully scraped ${data.length} comments.`);  //gets amount of top-level comments and their nested chidlren elements as well
}; 

await scrapeSubreddit(); //scrapes across all posts and comments without triggering Reddit API limits - could potentially accommodate to increase amount without compromising thresholds 
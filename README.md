Reddit Mod Bot
==============

By John Resig http://ejohn.org/  
MIT Licensed

For support please visit:  
http://reddit.com/r/modbot

This project is a pair of bots designed to help sub-reddits moderate themselves in an easier fashion. At minimum the bots should drastically reduce the amount of time that moderaters spend dealing with issues stuck in the spam filter - and should noticably improve the overall experience for submitters.

There are two bots because each take a very different strategy to moderating. I discuss the particulars of each bot in their particular sections.

That being said the two bots do have some common functionality: Both bots automatically police reported posts and comments, removing comments and posts that have been reported at least 10 times (this number is configurable). This should help to keep your sub-reddit tidy and allow you to reduce the amount of manual moderation that you do.

Man_is_Evil
===========

By default Reddit makes the assumption that many new users (or first time posters) are evil (in that they're likely spammers). In general this is good as it helps to keep spam to a minimum - in practice however many users' posts get stuck in the spam filter with absolutely no explanation. (Many users think they've been banned or that somehow the spam filter hates them - frequently becoming angry at the moderators or even angry at Reddit itself).

Man_is_Evil is a bot that's designed to build upon this basic premise but give users the tools that they need in order to help themselves when they get stuck.

Man_is_Evil is primarily a web application that users can access to find out more about the links that they've posted. The application can tell them if their links are stuck in the spam filter, have been removed by a moderator, have been approved by a moderator, or even if the post just doesn't exist. At this time users are limited to 5 post checks per 24 hours.

This information alone can be very informational to a user, it brings a level of transparency that they don't currently enjoy.

However Man_is_Evil goes a step further and allows users to remove up to one post from the spam filter per 24 hours. This is a good thing as it allows many first time posters to actually let their posts go live, rather than being stuck in spam filter purgetory.

The system only allows for spam-filtered posts to be moderated via this system. Posts that have been manually removed by a moderator will never be overriden by the bot.

Will spammers use this? Possibly. However the limitations that are in place are severe and prevent it from being useful for most spammers. And even if bad posts make it through, people can still report it for removal by the bot or the moderators can manually remove it themselves.

**How will this affect me?**

**Users:** You will now have the tools that you need to gain insight into what's going on with your posts and possibly remove a post that has been stuck in Reddit's spam filter.

**Moderators:** Providing this tool should dramatically reduce the number of support requests that come in while still providing while generally keeping out first time (typically lower quality) posters.

Man_is_Good
===========

On the other hand the Man_is_Good bot makes a very different assumption. It assumes that *all* posts are valid non-spam posts. The bot will approve everything that's been automatically flagged by Reddit's spam filter.

Using this logic, combined with the automatic removal of comments and posts that get a sufficient number of reports, you could create a sub-reddit that is entirely self-policing and makes no assumptions about the quality of Reddit's spam filter.

Naturally users will still be able to check on the status of their posts on the provided web application - but it's doubtful that they will need to as their posts will always be working as they expect it to.

**How will this affect me?**

**Users:** Every post you make in a sub-reddit that uses the Man_is_Good bot will get posted, none of them will get caught in the spam filter. There's no guarantee that your post won't get removed later but at least it won't be because of the spam filter.

**Moderators:** This will likely generate an increase in lower quality posts but will drastically reduce the number of support requests that you get - not to mention that your sub-reddit users will be happier since their posts will always go live.

How to Use
==========

Note that while you can run these bots on your own, you don't have to. I'm already running them and taking care of things in the background for you. If you want to run your own, see the associated section at the end.

It's assumed that if you're reading this then you're already a moderator of a sub-reddit. If you are not, but you think that these bots sound like a good idea, then you should contact your favorite moderators and petition them to use one of them.

Moderators, read on:

**Step 1:** You first need to decide which style of moderation you want to use (Man_is_Evil or Man_is_Good). Once you've made that decision all you need to do is add either user as a new moderator to your sub-reddit. The bot will automatically start watching your sub-reddit within 10-15 minutes.

**Step 2:** I highly recommend prominently linking to the page where users can check on their post status (but especially so if you're using Man_is_Evil). You can do this in the sidebar of your sub-reddit, or even elsewhere. Multiple options are as list below.

    Wondering where your post is? [Check Here!](http://reddit.com/)

**Step 3:** There is some minor, optional, configuration. If you wish to change the minimum number of reports needed in order to remove a comment or a post you'll need to add some dummy links into the sidebar of your sub-reddit. The default for each option is '10' (in that if a comment is reported 10 times it is automatically removed or if a post is reported 10 times it is automatically removed). You can set the option to 0 if you wish to disable this feature entirely.

Increase the Minimum Number of Reports:

    [](/min_comment_report=15)
    [](/min_post_report=15)

Disable Automatic Report Handling Entirely:

    [](/min_comment_report=0)
    [](/min_post_report=0)

With all that squared away you should be good-to-go! If you encounter any problems, please post to the /r/modbot sub-reddit.

Running Your Own Bot
====================

If you wish to run your own bot you'll need to have Node.js installed and possibly have a working knowledge of JavaScript. You do not need to run your own but in order to take advantage of the above functionality, all of that is provided for you "free of charge" - just add one of the mod users and the system will do the rest.

If you really want to work on your own you'll need to have Node.js installed and the mustache module. This module can be installed by running:

    npm install mustache

To run a bot you'll just need to run either `./good` or `./evil` for the appropriate functionality. All of the internal logic for connecting to Reddit can be found in modbot.js.

Note that there is one piece of configuration. You'll need to open backup.js and add in the Reddit cookie of the user which will be acting as a bot. You can find this cookie in multiple ways, in your browser of choice. Full details for various browsers is as follows:

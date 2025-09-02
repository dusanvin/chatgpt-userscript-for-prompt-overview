ChatGPT Prompt Overview (Tampermonkey)

Tampermonkey userscript that adds a floating prompts navigation to ChatGPT conversations on chatgpt.com. It lists your user messages, lets you jump to any prompt with one click, briefly highlights the target, and keeps the active item in sync as you scroll.

Based on and modernized from llagerlof/chatgpt-userscript (thank you!) — see: https://github.com/llagerlof/chatgpt-userscript

License: MIT

What you get

A compact, draggable-style floating panel (bottom-right) listing your user prompts in order.

Each item shows “prompt N” + a multi-line preview (up to ~40 words, clamped to 4 lines).

Click an item → smooth-scroll to the message and flash-highlight the target.

Auto-sync as you scroll: the list tracks which prompt is in view.

Auto-update when the conversation changes (new turns, edits) and on URL changes.

Collapse/expand the panel with a single button.

No network calls, no data collection — all client-side.

Works on ChatGPT conversation pages (https://chatgpt.com/c/*).

Install (Tampermonkey)

Install Tampermonkey in your browser (Chrome, Firefox, Edge, Safari).

Open the Tampermonkey Dashboard → Create a new script….

Replace the template with your script’s code (the one you posted) and make sure the header contains at least:

// @match       https://chatgpt.com/c/*
// @run-at      document-idle


Optional (for older links): also add
// @match https://chat.openai.com/c/*

Save and ensure the script is Enabled.

Open any ChatGPT conversation and look for the “User prompts” panel at the bottom-right.

Tip: If you don’t see it, reload once the conversation has loaded.

Usage

The floating panel appears on conversation pages.

Click a list item to jump to that prompt; the target briefly flash-highlights.

As you scroll, the list automatically marks the active prompt.

Click the “—” button in the header to collapse/expand the list.

The panel rebuilds itself when:

A new message is added/edited

The URL changes (navigating between chats)

You switch tabs and come back (light refresh)

Limitations

The script is tied to ChatGPT’s current DOM structure. If OpenAI changes it, selectors may need updates.

Only user messages are listed (assistant/system messages are ignored).

The script matches https://chatgpt.com/c/* by default. Other paths won’t show the panel.

Very long or streaming conversations might delay the initial rebuild briefly (it’s throttled for stability).

Customization (optional)

Open the script and adjust what you need.

Match other domains/paths

In the metadata header:

// @match       https://chatgpt.com/c/*
// @match       https://chat.openai.com/c/*   // optional legacy domain

Change the preview length (default: 40 words)

Inside extractPromptPreview():

return words.slice(0, 40).join(" ");


Increase/decrease 40 to your liking.

Tweak the “active in viewport” sensitivity

In setupIntersectionObserver() the threshold is:

{ root: null, threshold: [0.55] }


Lower it to activate earlier (e.g., 0.3), raise it for stricter focus (e.g., 0.7).

Rename panel title / restyle the card

In createMenuRoot() you’ll find:

<div class="title">User prompts</div>


And a <style> block where you can edit fonts, sizes, max-width, max-height, etc.

Target different message nodes

The script uses:

const TARGET_SELECTOR = 'article[data-testid^="conversation-turn-"]';


and checks for data-message-author-role="user". If ChatGPT changes these, update both accordingly.

Troubleshooting

No panel appears

Ensure you’re on a conversation page like https://chatgpt.com/c/<id>.

Confirm the script is enabled and the @match is correct.

Reload once the conversation has finished loading.

List is empty

The current chat might not have any user messages yet.

Wait a moment or scroll — the MutationObserver will trigger a rebuild.

Jumping doesn’t highlight

Some themes/extensions may override animations. It’s a brief background flash, not a box-shadow.

Conflicts

Temporarily disable other ChatGPT UI scripts/extensions to rule out selector clashes.

Still stuck?

Open DevTools → Console to look for errors and selector issues.

Privacy

Runs locally in your browser.

No network requests, no analytics, no data collection.

Uninstall

Tampermonkey Dashboard → select the script → Delete (trash icon).

License

MIT

Changelog

1.4 – Prompt list with previews, smooth jump + highlight, active-on-scroll via IntersectionObserver, live rebuild via MutationObserver, URL change/watch, collapse toggle, light UI polish.

1.3 – Internal refactors, minor style updates.

1.2 – Stability improvements for long conversations.

1.1 – Smooth-scroll fallback + visibility refresh.

1.0 – Initial version derived from llagerlof/chatgpt-userscript.

Credits

Original idea & groundwork: llagerlof/chatgpt-userscript

This fork: refreshed selectors, UI, and behavior for chatgpt.com conversations.

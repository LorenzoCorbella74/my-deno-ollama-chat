# My Deno Ollama Chat

Deno Ollama Chat is a terminal-based AI chat application built with Deno. It uses the [Ollama](https://ollama.com/) library to interact with AI models and provides a variety of commands to manage chat sessions, models, and history.

## Commands

| Command           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `/help`           | Show available commands.                                                   |
| `/list`           | Show available AI models.                                                  |
| `/system <text>`  | Set the content of the system prompt and reset messages.                   |
| `/save <name>`    | Save the current chat with the specified name.                             |
| `/load`           | Load a saved chat.                                                        |
| `/current`        | Show the currently used model.                                             |
| `/clear`          | Reset the chat history to the default system prompt.                         |
| `/history`        | Show chat history. Options to delete specific messages or clear history.   |
| `/bye`            | Exit the chat.                                                            |

## Installation
After installing [Deno](https://deno.com/) and [Ollama](https://ollama.com/) clone the repo, and run the following commands:

```bash
> deno install 
> deno task dev
```
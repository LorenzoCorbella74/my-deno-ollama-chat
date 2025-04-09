import { blue, red, green, cyan, yellow, magenta } from "@std/fmt/colors";
import * as path from "@std/path";
import ollama, { Message, ModelResponse } from "ollama";
import { Spinner } from "@std/cli/unstable-spinner";

// Defaults
const SYSTEM_PROMPT = {
  role: "system",
  content:
    "You are a helpful AI assistant called MAX. Reply from now on in Italian even if the requests are in other languages.",
};
const temperature = 0.7;
const num_ctx = 2048;
const max_tokens = 2048;

let MODEL = "llama3.2:latest";
let messages: Message[] = [SYSTEM_PROMPT];
let currentTemperature = temperature;
let currentNumCtx = num_ctx;
let currentMaxTokens = max_tokens;
/* let top_p = 0.95;
let top_k = 40;
let presence_penalty = 0;
let frequency_penalty = 0; */

// Available commands
function showCommands() {
  console.log(green("/help           - Show available commands."));
  console.log(green("/list           - Show available models."));
  console.log(green("/system <text>  - Set the content of the system prompt and reset messages."));
  console.log(green("/save <name>    - Save the current chat with the specified name."));
  console.log(green("/load           - Load a saved chat."));
  console.log(green("/current        - Show the currently used model."));
  console.log(green("/clear          - Reset the chat history and default system prompt and params"));
  console.log(green("/history        - Show chat history."));
  console.log(green("/params         - Set the temperature and num_ctx interactively."));
  console.log(green("/bye            - Exit the chat.\n"));
  console.log();
}

// List available models
async function listModels() {
  try {
    const list = await ollama.list(); // Assuming ollama has a listModels method
    const models = list.models;
    console.log(blue("%cAvailable models:"),"text-decoration: underline");
    models.forEach((model: ModelResponse, index: number) => {
      console.log(`${index + 1}. ${model.name} - ${model.details.family} - ${model.details.parameter_size}`);
    });

    const input = prompt(cyan("\nSelect a model by entering the corresponding number: "));
    const selectedIndex = parseInt(input || "") - 1;
    if (selectedIndex >= 0 && selectedIndex < models.length) {
      MODEL = models[selectedIndex].name;
      console.log(green(`Selected model: ${MODEL}\n`));
    } else {
      console.log(red("Invalid selection. Default model retained."));
    }
    messages = [SYSTEM_PROMPT];
    chatLoop(); // Resume the chat loop
  } catch (error) {
    console.log(red("Error while retrieving models:"), error);
    chatLoop(); // Resume the chat loop in case of error
  }
}

// Function to save the current chat
async function saveChat(fileName: string) {
  const chatData = {
    model: MODEL,
    messages: messages,
  };

  const dir = "./chats";
  try {
    await Deno.mkdir(dir, { recursive: true }); // Create the directory if it doesn't exist
  } catch {
    // Directory already exists
  }

  const filePath = path.join(dir, `${fileName}.json`);
  await Deno.writeTextFile(filePath, JSON.stringify(chatData, null, 2));
  console.log(yellow(`Chat successfully saved in ${fileName}.json`));
  chatLoop();
}

// Function to load a saved chat
async function loadChat() {
  const dir = "./chats";
  try {
    const files = [];
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        files.push(entry.name);
      }
    }

    if (files.length === 0) {
      console.log(red("No saved chats found."));
      chatLoop();
      return;
    }

    console.log(blue("Available saved chats:"));
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    const input = prompt(green("User: "));
    if (input === null) {
      console.log(red("Invalid input. Try again."));
    } else {
      const selectedIndex = parseInt(input) - 1;
      if (selectedIndex >= 0 && selectedIndex < files.length) {
        const filePath = path.join(dir, files[selectedIndex]);
        const chatData = JSON.parse(await Deno.readTextFile(filePath));
        MODEL = chatData.model;
        messages = chatData.messages;
        console.log(green(`Chat successfully loaded from ${files[selectedIndex]}`));
      } else {
        console.log(red("Invalid selection."));
      }
      chatLoop();
    }
  } catch (error) {
    console.log(red("Error while loading chats:"), error);
    chatLoop();
  }
}

async function chatCompletion(text: string) {
  const userMessage = { role: "user", content: text };
  const spinner = new Spinner();
  spinner.start();

  try {
    const response = await ollama.chat({
      model: MODEL,
      stream: true,
      options: {
        temperature: currentTemperature,
        // top_p,
        // top_k,
        // presence_penalty,
        // frequency_penalty,
        num_ctx: currentNumCtx,
        // num_predict: currentMaxTokens,
      },
      messages: [...messages, userMessage],
    });

    spinner.stop();

    // Streaming response
    Deno.stdout.write(new TextEncoder().encode(cyan("AI: ")));
    let aiReply = "";
    for await (const part of response) {
      aiReply += part.message.content;
      Deno.stdout.write(new TextEncoder().encode(yellow(part.message.content)));
      if (part.done) {
        const ts = (part.eval_count / part.eval_duration) * Math.pow(10, 9);
        const load_duration = part.load_duration / Math.pow(10, 9);
        const prompt_eval_duration = part.prompt_eval_duration / Math.pow(10, 9);
        console.log(
          magenta(
            `\nToken/s: ${ts.toFixed(2)} - Load model: ${load_duration.toFixed(
              2
            )}s - Prompt eval: ${prompt_eval_duration.toFixed(2)}s`
          )
        );
      }
    }
    messages.push(userMessage);
    messages.push({ role: "assistant", content: aiReply });
  } catch (error) {
    spinner.stop(); // Ensure the spinner stops in case of an error
    console.log(red("Error:"), error);
  }
}

async function chatLoop() {
  const input = prompt(green("User: "));
  if (!input) {
    console.log(red("Invalid input. Try again."));
    chatLoop(); // Restart the loop
  }
  
  if (input?.toUpperCase() === "EXIT" || input === "/bye") {
    console.log(blue("Goodbye!"));
    Deno.exit();
  } else if (input === "/history") {
    console.log(blue("Chat history:"));
    messages.forEach((message, index) => {
      const role = message.role === "user" ? "User" : "AI";
      console.log(`${index + 1}. ${role}: ${message.content}`);
    });
    chatLoop(); // Resume the chat loop
  } else if (input === "/help") {
    console.log(blue("\n%cHere are the available commands:\n"),"text-decoration: underline");
    showCommands(); // Show available commands
    chatLoop();
  } else if (input === "/list") {
    await listModels(); // Show available models
  } else if (input?.startsWith("/save")) {
    const fileName = input?.split(" ")[1];
    if (fileName) {
      await saveChat(fileName);
    } else {
      console.log(red("Error: specify a name for the save file."));
    }
  } else if (input === "/load") {
    await loadChat(); // Load a saved chat
  } else if (input === "/current") {
    console.log(blue(`Currently used model: ${MODEL}`));
    chatLoop();
  } else if (input === "/clear") {
    console.log(blue(`Reset the chat history to default system prompt and params.`));
    messages = [SYSTEM_PROMPT]; 
    currentTemperature = temperature;
    currentNumCtx = num_ctx;
    // currentMaxTokens = max_tokens;
    chatLoop();
  } else if (input?.startsWith("/system")) {
    const newSystemPrompt = input.split(" ").slice(1).join(" ");
    if (newSystemPrompt) {
      SYSTEM_PROMPT.content = newSystemPrompt;
      messages = [SYSTEM_PROMPT]; 

      console.log(green("SYSTEM_PROMPT successfully updated!"));
    } else {
      console.log(red("Error: specify valid content for the SYSTEM_PROMPT."));
    }
    chatLoop();
  } else if (input === "/params") {
    // Prompt the user for temperature
    const tempInput = prompt(green("Enter temperature (0-1): "), '0.7');
    const newTemperature = parseFloat(tempInput || "");

    if (!isNaN(newTemperature) && newTemperature >= 0 && newTemperature <= 1) {
      currentTemperature = newTemperature;
      console.log(green(`Temperature successfully set to ${currentTemperature}`));
    } else {
      console.log(red("Invalid temperature. Please provide a value between 0 and 1."));
    }

    // Prompt the user for num_ctx
    const ctxInput = prompt(green("Enter num_ctx (positive integer): "), '2048');
    const newNumCtx = parseInt(ctxInput || "");

    if (!isNaN(newNumCtx) && newNumCtx > 0) {
      currentNumCtx = newNumCtx;
      console.log(green(`num_ctx successfully set to ${currentNumCtx}`));
    } else {
      console.log(red("Invalid num_ctx. Please provide a positive integer."));
    }

    chatLoop(); // Resume the chat loop
  } else {
    chatCompletion(input!).then(() => chatLoop());
  }
}

// Show available commands at the start
console.log(blue("%cWelcome to my Deno Ollama chat!\n"), "font-weight: bold");
console.log(blue("%cHere are the available commands:"), "text-decoration: underline");
showCommands();



await listModels();

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";
import { Diagnostic } from "@foxglove/studio-base/players/UserNodePlayer/types";
import { UserNodes } from "@foxglove/studio-base/types/panels";
import { Button, InputBase, Stack } from "@mui/material";
import OpenAI from "openai";
import { ChatCompletion } from "openai/resources";
import { useState } from "react";

type Props = { nodeId?: string, diagnostics: readonly Diagnostic[]; userNodes: UserNodes; setUserNodes: (userNodes: UserNodes) => void };
type Message = { role: "system" | "user", content: string }

const PromptSection = ({ nodeId, diagnostics, userNodes, setUserNodes }: Props): JSX.Element => {
  const { } = useNstrumentaContext();
  const [completion, setCompletion] = useState<ChatCompletion>()
  const [userPrompt, setUserPrompt] = useState<string>()

  const { search } = window.location;
  const apiKeyParam = new URLSearchParams(search).get("OpenAIKey");
  const apiLocalStore = localStorage.getItem("OpenAIKey");
  const apiKey = apiKeyParam
    ? apiKeyParam
    : apiLocalStore
      ? apiLocalStore
      : (prompt("Enter your OpenAI apiKey") as string);
  if (apiKey) {
    localStorage.setItem("OpenAIKey", apiKey);
  }

  const systemMessage: Message =
  {
    role: "system",
    content:
      `You are a helpful assistant named chatNST.
    you don't ever use external dependencies,
    Your answers are concise and you don't add alignment boilerplate to the end of your messages.
    Your answer should directly replace the provided javascript block
    The code is always complete and runnable (it doesn't for example reference other code from a comment)
    any non code is written as comments in the code block,
    you always include the previous imports at the top`
  }


  const fixProblems = async () => {
    if (!userPrompt || !nodeId || userNodes[nodeId] == undefined) return
    //call gpt with prompt from input and current script
    // TODO move this into NstrumentaProvider
    // get key from user


    console.log(nodeId)
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });



    let content = `Fix the problems in the currnet code`
    content += `\nhere is the current code: \n`
    content += `\`\`\`javascript \n ${userNodes[nodeId]!.sourceCode} \n\`\`\``
    content += `\n and here are the current problems: ${JSON.stringify(diagnostics)}`


    // Append previous messages and user input to the messages array
    console.log(content)
    const newCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106", //"gpt-4", // Replace with the desired model version
      messages: [systemMessage, {
        role: 'user',
        content
      }],
    });

    console.log(newCompletion?.choices[0]?.message.content)
    const sourceCode = newCompletion!.choices[0]!.message.content!.split('```javascript')[1]?.split('```')[0]
    if (sourceCode) {
      setUserNodes({
        [nodeId]: {
          sourceCode,
          name: userNodes[nodeId]!.name
        },
      });
    }



    setCompletion(newCompletion)
  }

  const runPrompt = async () => {
    if (!userPrompt || !nodeId || userNodes[nodeId] == undefined) return
    //call gpt with prompt from input and current script
    // TODO move this into NstrumentaProvider
    // get key from user


    console.log(nodeId)
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

    let content = `you are prompted with a wrapper code,
     replace the relevant sections to ${userPrompt} on the input and return the runnable output.
     always implement the algorithm with minimal code and don't rely on external dependencies`

    content += `\nhere is the current code: \n`
    content += `\`\`\`javascript \n ${userNodes[nodeId]!.sourceCode} \n\`\`\``
    content += `\n and here are the current problems: ${JSON.stringify(diagnostics)}`

    console.log(content)
    const newCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106", //"gpt-4", // Replace with the desired model version
      messages: [systemMessage, {
        role: 'user',
        content
      }],
    });

    console.log(newCompletion?.choices[0]?.message.content)
    const sourceCode = newCompletion!.choices[0]!.message.content!.split('```javascript')[1]?.split('```')[0]
    if (sourceCode) {
      setUserNodes({
        [nodeId]: {
          sourceCode,
          name: userNodes[nodeId]!.name
        },
      });
    }

    setCompletion(newCompletion)
  }







  return (
    <>
      <Stack>
        <Button
          size="small"
          color="primary"
          variant="contained"
          disabled={userPrompt?.length == 0}
          title="Run"
          onClick={runPrompt}
        >
          Run
        </Button>
        <Button
          size="small"
          color="primary"
          variant="contained"
          disabled={userPrompt?.length == 0}
          title="Fix Problems"
          onClick={fixProblems}
        >
          Fix
        </Button>
      </Stack>
      <InputBase
        value={userPrompt ?? ""}
        onChange={(event) => setUserPrompt(event.target.value)}
      />
      {completion?.choices[0]?.message.content}
    </>
  );
};

export default PromptSection;

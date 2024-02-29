/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HardwareConfig,
  LocalLLMConfig,
} from "electron/main/Store/storeConfig";
import { ISendFunctionImplementer, LLMSessionService } from "../Types";
import { errorToString } from "../../Generic/error";

export class LlamaCPPSessionService implements LLMSessionService {
  private session: any;
  private context: any;
  private model: any;
  private abortController?: AbortController;
  private contextLength?: number;

  async init(
    modelName: string,
    storeModelConfig: LocalLLMConfig,
    hardwareConfig: HardwareConfig
  ): Promise<void> {
    this.contextLength = storeModelConfig.contextLength;
    await this.loadModel(storeModelConfig.localPath, hardwareConfig);

    if (!this.isModelLoaded()) {
      throw new Error("Model not loaded");
    }

    const nodeLLamaCpp = await import("node-llama-cpp");
    this.context = await new nodeLLamaCpp.LlamaContext({
      model: this.model,
      contextSize: storeModelConfig.contextLength,
    });
    this.session = await new nodeLLamaCpp.LlamaChatSession({
      contextSequence: this.context.getSequence(),
      systemPrompt: "",
    });
  }

  public getContextLength(): number {
    return this.contextLength || 0;
  }

  private async loadModel(
    localModelPath: string,
    hardwareConfig: HardwareConfig
  ): Promise<void> {
    const nodeLLamaCpp = await import("node-llama-cpp");
    console.log("hardwareConfig:", hardwareConfig);
    const llama = await nodeLLamaCpp.getLlama({
      cuda: hardwareConfig.useCUDA,
      vulkan: hardwareConfig.useVulkan,
    });
    this.model = new nodeLLamaCpp.LlamaModel({
      llama,
      modelPath: localModelPath,
      gpuLayers: hardwareConfig.useGPU ? 100 : 0,
    });
  }

  private isModelLoaded(): boolean {
    return !!this.model;
  }

  public tokenize = (text: string): number[] => {
    return this.session.model.tokenize(text);
  };

  public abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined; // Reset the controller
    }
  }

  public async streamingPrompt(
    prompt: string,
    sendFunctionImplementer: ISendFunctionImplementer,
    ignoreChatHistory?: boolean
  ): Promise<string> {
    if (!this.session && !this.context) {
      sendFunctionImplementer.send("tokenStream", {
        messageType: "error",
        content: "Session not initialized",
      });
      return "Session not initialized";
    }
    if (ignoreChatHistory) {
      this.session.setChatHistory([]);
    }
    console.log("starting streaming prompt");
    this.abortController = new AbortController();

    try {
      return await this.session.prompt(prompt, {
        onToken: (chunk: any[]) => {
          const decodedChunk = this.session.model.detokenize(chunk);
          console.log("decodedChunk:", decodedChunk);
          sendFunctionImplementer.send("tokenStream", {
            messageType: "success",
            content: decodedChunk,
          });
        },
        signal: this.abortController.signal,
      });
    } catch (err) {
      sendFunctionImplementer.send("tokenStream", {
        messageType: "error",
        content: errorToString(err),
      });
      return "";
    }
  }
}

// const getGPULayersToUse = (): number => {
//   if (process.platform === "darwin" && process.arch === "arm64") {
//     return 100; // NOTE: Will use fewer GPU layers if the model has fewer layers.
//   }
//   return 0;
// };

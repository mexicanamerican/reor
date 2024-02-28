import React, { useState } from "react";
import Modal from "../Generic/Modal";
import LLMSettings from "./LLMSettings";
import EmbeddingModelSettings from "./EmbeddingSettings";
import RagSettings from "./RagSettings";
import HardwareSettings from "./HardwareSettings";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<ModalProps> = ({
  isOpen,
  onClose: onCloseFromParent,
}) => {
  const [willNeedToReIndex, setWillNeedToReIndex] = useState(false);
  const [activeTab, setActiveTab] = useState("llmSettings");

  const handleSave = () => {
    if (willNeedToReIndex) {
      console.log("reindexing files");
      window.database.indexFilesInDirectory();
    }
    onCloseFromParent();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleSave();
      }}
    >
      <div className="mt-0 flex w-[600px] ">
        <div className="flex flex-col ml-2 mb-2 pr-1 w-[100px]  bg-gray-800 text-white border-r-[0.1px] border-gray-700 border-solid border-b-0 border-t-0 border-l-0">
          <div
            className={`flex items-center mt-2 rounded cursor-pointer p-2 border-b border-gray-200 hover:bg-gray-600 text-sm ${
              activeTab === "llmSettings"
                ? "bg-gray-700 text-white font-semibold"
                : "text-gray-200"
            }`}
            onClick={() => setActiveTab("llmSettings")}
          >
            LLM
          </div>
          <div
            className={`flex items-center rounded cursor-pointer p-2 border-b border-gray-200 hover:bg-gray-600 text-sm ${
              activeTab === "embeddingModel"
                ? "bg-gray-700 text-white font-semibold"
                : "text-gray-200"
            }`}
            onClick={() => setActiveTab("embeddingModel")}
          >
            Embedding Model
          </div>

          {/* gpu settings: */}
          <div
            className={`flex items-center rounded cursor-pointer p-2 border-b border-gray-200 hover:bg-gray-600 text-sm ${
              activeTab === "hardware"
                ? "bg-gray-700 text-white font-semibold"
                : "text-gray-200"
            }`}
            onClick={() => setActiveTab("hardware")}
          >
            Hardware
          </div>

          <div
            className={`flex items-center rounded cursor-pointer p-2 border-b border-gray-200 hover:bg-gray-600 text-sm ${
              activeTab === "RAG"
                ? "bg-gray-700 text-white font-semibold"
                : "text-gray-200"
            }`}
            onClick={() => setActiveTab("RAG")}
          >
            RAG{" "}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 ml-2">
          {/* <h2 className="text-2xl font-semibold mb-4 text-white">Settings</h2> */}
          {activeTab === "llmSettings" && (
            <div className="mt-2 w-full">
              <LLMSettings />
            </div>
          )}
          {activeTab === "embeddingModel" && (
            <div className="w-full">
              <EmbeddingModelSettings
                handleUserHasChangedModel={() => setWillNeedToReIndex(true)}
              />
            </div>
          )}

          {activeTab === "hardware" && (
            <div className="w-full">
              <HardwareSettings>
                <h2 className="text-2xl font-semibold mb-0 text-white">
                  Hardware
                </h2>{" "}
                <p className="mt-2 text-sm text-gray-100 mb-1">
                  Number of notes to feed to the LLM during Q&A:
                </p>
              </HardwareSettings>
            </div>
          )}

          {activeTab === "RAG" && (
            <div className="w-full">
              <RagSettings>
                <h2 className="text-2xl font-semibold mb-0 text-white">RAG</h2>{" "}
                <p className="mt-2 text-sm text-gray-100 mb-1">
                  Number of notes to feed to the LLM during Q&A:
                </p>
              </RagSettings>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;

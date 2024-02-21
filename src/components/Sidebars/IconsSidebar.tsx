import React, { useState } from "react";
import SettingsModal from "../Settings/Settings";
import { MdSettings } from "react-icons/md";
import { SidebarAbleToShow } from "../FileEditorContainer";
import { IoFolderOutline } from "react-icons/io5";
import { FaSearch } from "react-icons/fa";
import { FaRegPenToSquare } from "react-icons/fa6";
import NewNoteComponent from "../File/NewNote";
import NewDirectoryComponent from "../File/NewDirectory";
import { GrNewWindow } from "react-icons/gr";
import { LuFolderPlus } from "react-icons/lu";

interface LeftSidebarProps {
  onFileSelect: (path: string) => void;
  sidebarShowing: SidebarAbleToShow;
  makeSidebarShow: (show: SidebarAbleToShow) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onFileSelect,
  sidebarShowing,
  makeSidebarShow,
}) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [isNewDirectoryModalOpen, setIsNewDirectoryModalOpen] = useState(false);

  return (
    <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-between">
      <div
        className=" flex items-center justify-center w-full h-8 cursor-pointer"
        onClick={() => makeSidebarShow("files")}
      >
        <div
          className="rounded w-[80%] h-[80%] flex items-center justify-center hover:bg-slate-700"
          style={{
            backgroundColor: sidebarShowing === "files" ? "#334155" : "",
          }}
        >
          <IoFolderOutline className="mx-auto text-gray-200 " size={22} />
        </div>
      </div>

      <div
        className="flex items-center justify-center w-full h-8  cursor-pointer"
        onClick={() => makeSidebarShow("search")}
      >
        <div
          className="rounded w-[80%] h-[80%] flex items-center justify-center hover:bg-slate-700"
          style={{
            backgroundColor: sidebarShowing === "search" ? "#334155" : "",
          }}
        >
          <FaSearch size={18} className=" text-gray-200" />
        </div>
      </div>
      <div
        className="bg-transparent border-none cursor-pointer flex items-center justify-center w-full h-8 "
        onClick={() => setIsNewNoteModalOpen(true)}
      >
        <div className="rounded w-[80%] h-[80%] flex items-center justify-center hover:bg-slate-700">
          <FaRegPenToSquare className="text-gray-200" size={20} />
        </div>
      </div>
      <div
        className="bg-transparent mt-[2px] border-none cursor-pointer flex items-center justify-center w-full h-8 "
        onClick={() => setIsNewDirectoryModalOpen(true)}
      >
        <div className="rounded w-[80%] h-[80%] flex items-center justify-center hover:bg-slate-700">
          <LuFolderPlus className="text-gray-200" size={23} />
          {/* < /> */}
        </div>
      </div>
      <NewNoteComponent
        isOpen={isNewNoteModalOpen}
        onClose={() => setIsNewNoteModalOpen(false)}
        onFileSelect={onFileSelect}
      />
      <NewDirectoryComponent
        isOpen={isNewDirectoryModalOpen}
        onClose={() => setIsNewDirectoryModalOpen(false)}
        onDirectoryCreate={() => console.log("Directory created")}
      />
      <div className="flex-grow border-1 border-yellow-300"></div>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      <div
        className="bg-transparent border-none pb-2 mb-[2px] cursor-pointer flex items-center justify-center w-full"
        onClick={() => window.electron.openNewWindow()}
      >
        <GrNewWindow className="text-gray-100" size={21} />
      </div>
      <button
        className="bg-transparent border-none pb-2 cursor-pointer flex items-center justify-center w-full"
        onClick={() => setIsSettingsModalOpen(!isSettingsModalOpen)}
      >
        <MdSettings className="h-6 w-6 text-gray-100" />
      </button>
    </div>
  );
};

export default LeftSidebar;

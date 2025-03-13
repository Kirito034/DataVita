import React, { useState } from "react";
import Navbar from "../components/Navbar";
import BottomBar from "../components/BottomBar";
import LeftBar from "../components/LeftBar";
import PythonNotebook from "../components/PythonNotebook";

const Workplace = () => {
    const [openFiles, setOpenFiles] = useState([]);

    const onOpenFile = (file) => {
        console.log("Opening file:", file);  // ✅ Debugging log
        if (!openFiles.find(f => f.path === file.path)) {
            setOpenFiles([...openFiles, file]);
        }
    };

    return (
        <div className="workplace-container">
            <Navbar />
            <div className="workplace-content">
                <LeftBar onOpenFile={onOpenFile} />
                <PythonNotebook openFiles={openFiles} />
            </div>
            <BottomBar />
        </div>
    );
};

export default Workplace;

import React from "react";


export const Popup = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black opacity-50" onClick={onClose} />
            <div className="bg-white rounded-lg p-4 z-10">
                <h2 className="font-bold text-lg mb-2">{title}</h2>
                <div>{children}</div>
            </div>
        </div>
    );
};
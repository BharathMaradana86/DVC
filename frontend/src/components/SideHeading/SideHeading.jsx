import React from "react";


export const SideHeading = ({title}) => {
    return (
       <div className="flex h-[30px] align-start justify-start mt-[32px] ml-[32px]">
            <h3 className="font-bold text-3xl m-[0px]">{title}</h3>
       </div>
    )
}
"use client";

import * as React from "react";

interface FinalCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const FinalCheckbox = React.forwardRef<HTMLInputElement, FinalCheckboxProps>(
  ({ checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange(event.target.checked);
    };

    const style: React.CSSProperties = {
      width: '1rem', 
      height: '1rem',
      accentColor: 'black',
      cursor: 'pointer'
    };

    return (
      <input
        type="checkbox"
        ref={ref}
        style={style}
        checked={checked}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

FinalCheckbox.displayName = "FinalCheckbox";

export { FinalCheckbox };

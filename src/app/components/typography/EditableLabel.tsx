import { Box, Input, TypographySystem, useColorScheme } from "@mui/joy";
import React, { useEffect, useState } from "react";

interface TypographyStyle {
    fontSize: string,
    fontWeight: string,
    lineHeight: string
}

const typographyStyles = {
    h1: {
        fontSize: 'var(--joy-fontSize-xl4)',
        fontWeight: 'var(--joy-fontWeight-xl)',
        lineHeight: 'var(--joy-lineHeight-xs)'
    } as TypographyStyle,
    h2: {
        fontSize: 'var(--joy-fontSize-xl3)',
        fontWeight: 'var(--joy-fontWeight-xl)',
        lineHeight: 'var(--joy-lineHeight-xs)'
    } as TypographyStyle
    // Add other types here if needed
}

interface EditableLabelProps {
    children: React.ReactNode,
    onSave: (label: string) => void
}

export default function EditableLabel({ children, onSave }: EditableLabelProps) {
    const onlyChild = React.Children.only(children);

    const [showInputMode, setShowInputMode] = useState(false);
    const [initialValue, setInitialValue] = useState('');
    const [label, setLabel] = useState('');
    const [typographyStyle, setTypographyStyle] = useState<TypographyStyle | undefined>();
    const {mode} = useColorScheme();

    const save = () => {
        if (initialValue !== label) {
            onSave(label);
        }
        setShowInputMode(false);
    }

    useEffect(() => {
        let level: keyof TypographySystem;

        if (React.isValidElement(onlyChild) && (onlyChild.type as any)['muiName'] === 'Typography') {
            const text = onlyChild.props.children.props.children;
            level = onlyChild.props.level;
            setInitialValue(text);
            setLabel(text);
            // @ts-ignore
            setTypographyStyle(typographyStyles[level]); // I'm too lazy to add all types here, do it when you need it
        }

    }, [children, onlyChild])

    const cursorPath = mode === 'light' ? '/assets/pencil_light.png' : '/assets/pencil_dark.png';

    return (
        <>
            {showInputMode &&
                <Input
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            save();
                        }
                    }}
                    onBlur={(_) => {
                        save();
                    }}
                    onChange={(e) => {
                        setLabel(e.target.value);
                    }}
                    sx={{
                        p: 0,
                        '--Input-focusedThickness': '0',
                        border: '0',
                        boxShadow: 'none',
                        color: 'text.primary',
                        fontSize: `${typographyStyle?.fontSize}`,
                        fontWeight: `${typographyStyle?.fontWeight}`,
                        lineHeight: `${typographyStyle?.lineHeight}`,
                    }}
                    value={label}
                />}
            {!showInputMode &&
                <Box onClick={() => { setShowInputMode(true); }} sx={{
                    '&:hover': {
                        cursor: `url(${cursorPath}), auto`
                    }
                }}>
                    {children}
                </Box>
            }
        </>
    );
}
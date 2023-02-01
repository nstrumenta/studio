import type { ReactNode } from 'react';
import './Modal.css';
interface IProps {
    onAfterOpen?: () => void;
    onClose?: () => void;
    onAfterClose?: () => void;
    title: string;
    isOpen: boolean;
    height?: string;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    closeTimeoutMS?: number;
    closeClickOutside?: boolean;
    closeBtn?: boolean;
    children?: ReactNode;
}
export declare const Modal: React.FunctionComponent<IProps>;
export {};

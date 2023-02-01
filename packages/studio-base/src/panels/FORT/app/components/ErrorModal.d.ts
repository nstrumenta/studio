import { Component } from 'react';
interface IProps {
    onClose: () => void;
    message: string;
    isOpen: boolean;
}
export declare class ErrorModal extends Component<IProps> {
    shouldComponentUpdate(nextProps: IProps): boolean;
    closeClicked(): void;
    render(): JSX.Element;
}
export {};

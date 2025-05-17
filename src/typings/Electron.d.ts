import { BaseWindow } from "electron";

declare global {
	var electronWindow: BaseWindow;

	interface Window {
		electronWindow: BaseWindow;
	}
}
import * as vscode from "vscode";
import debounce from "lodash.debounce";

const DEFAULT_COLOR = "#ffffff";


function createStatusBarItem() {
    const item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        99999999, // And you think z-index games are bad! :D
    );

    item.color = getUnsavedColor();
    item.text = "UNSAVED";
    item.tooltip = "You have at least one unsaved file. Click to save all.";
    item.command = "workbench.action.files.saveAll";
    item.hide();

    return item;
}

function getUnsavedColor(): string {
    const config: any = vscode.workspace.getConfiguration().get("usaved");

    if (config && config.color && typeof config.color === 'string') {
        return config.color;
    }

    return DEFAULT_COLOR;
}

class UnsavedTracker {
    statusBarItem = createStatusBarItem();
    workbenchConfig = vscode.workspace.getConfiguration("workbench");

    changeListener = vscode.workspace.onDidChangeTextDocument(() => {
        this.debouncedStatusBarItemUpdate();
    });

    saveListener = vscode.workspace.onDidSaveTextDocument(() => {
        this.debouncedStatusBarItemUpdate.cancel();
        this.updateStatusBarItem();
    });

    debouncedStatusBarItemUpdate = debounce(this.updateStatusBarItem, 200);

    constructor() {
        this.updateStatusBarItem();
    }

    hasUnsavedFiles() {
        return vscode.workspace.textDocuments.some(editor => editor.isDirty);
    }

    updateStatusBarItem() {
        if (this.hasUnsavedFiles()) {
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    dispose() {
        this.debouncedStatusBarItemUpdate.cancel();
        this.statusBarItem.dispose();
        this.changeListener.dispose();
        this.saveListener.dispose();
    }
}

class DisposableHolder {
    disposable: { dispose: Function };

    constructor(disposable: { dispose: Function }) {
        this.disposable = disposable;
    }

    dispose() {
        this.disposable.dispose();
    }
}

export function activate(context: vscode.ExtensionContext) {
    let tracker = new UnsavedTracker();
    const holder = new DisposableHolder(tracker);
    context.subscriptions.push(holder);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('usaved.color')) {
                tracker.statusBarItem.color = getUnsavedColor();
            }
        }),
    );
}
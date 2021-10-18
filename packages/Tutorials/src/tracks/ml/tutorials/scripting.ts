import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import { filter } from 'rxjs/operators';
import { Tutorial } from '../../../tutorial';


export class ScriptingTutorial extends Tutorial {
  get name() {
    return 'Scripting';
  }
  get description() {
    return 'Scripting is an integration mechanism with languages for statistical computing';
  }
  get steps() { return 1; }

  helpUrl: string = 'https://datagrok.ai/help/develop/scripting';

  protected async _run() {
    this.header.textContent = this.name;
    this.describe('Scripting is an integration mechanism with languages for statistical computing');

    this.describe(ui.link('More about ' + this.name, this.helpUrl).outerHTML);

    this.title('Create and run a script');
    const editorIntro = 'This is a script editor. Here, you write code and bind the parameters to the ' +
      'sample dataset (press F1 to get help on parameter format). Also, the editor lets you load ' +
      'previously saved scripts, including the samples designed to help better understand the platform.';
    const sv = await this.openViewByType(
      'Click on "Functions | Scripts | New Script" to open a script editor',
      'ScriptView', null, editorIntro
    );

  }
}

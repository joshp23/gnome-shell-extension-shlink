/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const St = imports.gi.St
const Main = imports.ui.main
const Soup = imports.gi.Soup
const Meta = imports.gi.Meta
const Shell = imports.gi.Shell
const ExtensionUtils = imports.misc.extensionUtils;

const Me = imports.misc.extensionUtils.getCurrentExtension()
const Utils = Me.imports.utils
const Prefs = Me.imports.prefs

class Extension {
  enable() {
    this.clipboard = St.Clipboard.get_default()
    this.settings = ExtensionUtils.getSettings()

    Main.wm.addKeybinding(
      Prefs.SHORTEN_AND_COPY_KEY,
      this.settings,
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL |
      Shell.ActionMode.OVERVIEW,
      () => this.shorten(),
    )
  }

  shorten() {
    this.clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
      const url = Utils.get_url(text)

      if (url === null) {
        this.showNotification('No URL found in clipboard')
        return
      }
      
      const api_url = `${this.settings.get_string(Prefs.INSTANCE_URL_KEY)}/yourls-api.php`
      const api_key = this.settings.get_string(Prefs.API_KEY_KEY)      
      const session = new Soup.Session()
      const message = Soup.form_request_new_from_hash('POST', api_url, {
        'signature': api_key,
        'action': 'shorturl',
        'url': text,
        'format': 'json'
      })
      
      session.queue_message(message, (session, response) => {
        const data = JSON.parse(message.response_body.data)
        if (data.statusCode !== 200) {
          this.showNotification(`Could not shorten URL: ${data.message}`)
          return
        }
        
        this.clipboard.set_text(St.ClipboardType.CLIPBOARD, data.shorturl)
        this.showNotification(`Shortened URL: ${data.shorturl}`)
      })
    })
  }

  showNotification(text) {
    Main.notify(text)
  }

  disable() {
    Main.wm.removeKeybinding(Prefs.SHORTEN_AND_COPY_KEY)
  }
}

function init() {
  return new Extension()
}

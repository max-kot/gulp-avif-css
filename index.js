const through = require('through2')
const css = require('css')

class AvifCSS {
  constructor() {
    this.avaibleExtensions = ['png', 'jpg', 'jpeg', 'JPG', 'JPEG']
  }

  init = (extensions) => {
    return through.obj((buffer, _, callback) => {
      if (buffer.isNull()) {
        return callback(null, buffer)
      } else if (buffer.isStream()) {
        return callback(null, buffer)
      }

      if (extensions) {
        this.avaibleExtensions = extensions
      }

      this.buffer = buffer
      this.fileData = buffer.contents.toString()
      this.transform()

      callback(null, this.buffer)
    })
  }

  transform(rules = this.parseCSS()) {
    rules.forEach((expression) => {
      if (expression.type === 'media') {
        return this.transform(expression.rules)
      } else if (expression.type === 'rule') {
        expression.declarations
        .forEach((rule) => {
          if (!this.isBackground(rule)) return

          const imageExtension = this.getExtension(rule)

          if (!imageExtension) return

          this.createExpressions({
            rule,
            selectors: expression.selectors,
            position: expression.type === 'media'
              ? rule.position
              : expression.position,
            imageExtension
          })
        })
      }
    })

    this.buffer.contents = new Buffer.from(this.fileData)
  }

  parseCSS() {
    return css.parse(this.fileData).stylesheet.rules
  }

  isBackground({ property, value }) {
    if (
      property === 'background' ||
      property === 'background-image' &&
      value.indexOf('.webp') < 0 &&
      value.indexOf('.avif') < 0
    ) {
      return true
    }
  }

  getExtension({ value }) {
    return this.avaibleExtensions.find((extension) => {
      if (value.indexOf(extension) > 0) {
        return extension
      }
    })
  }

  createExpressions({ rule, selectors, position, imageExtension }) {
    const splitedData = this.fileData.split(/\n/)

    const rowIndex = position.end.line - 1
    const columnIndex = position.end.column - 1

    ;['avif', 'webp'].forEach((modernExtension) => {
      splitedData.splice(rowIndex, 1, this.changeString(
        splitedData[rowIndex],
        columnIndex,
        `
          .${modernExtension} ${selectors.join('')} {
            ${rule.property}: ${rule.value.replace(imageExtension, modernExtension)}
          }
        `.replaceAll('\n', '')
        )
      )
    })

    this.fileData = splitedData.join('\n')
  }

  changeString(string, changeIndex, changeText) {
    return string.substring(0, changeIndex) + changeText + string.substring(changeIndex)
  }
}

const avifcss = new AvifCSS()

module.exports = avifcss.init

import { ContentUtils, ColorUtils } from 'braft-utils'

export const keyCommandHandlers = (command, editorState, editor) => {

  if (editor.editorProps.handleKeyCommand && editor.editorProps.handleKeyCommand(command, editorState) === 'handled') {
    return 'handled'
  }

  if (command === 'braft-save') {
    editor.editorProps.onSave && editor.editorProps.onSave(editorState)
    return 'handled'
  }

  const { controls, excludeControls } = editor.editorProps
  const allowIndent = (controls.indexOf('text-indent') !== 0 || controls.find(item => item.key === 'text-indent')) && excludeControls.indexOf('text-indent') === -1
  const cursorStart = editorState.getSelection().getStartOffset()
  const cursorEnd = editorState.getSelection().getEndOffset()
  const cursorIsAtFirst = cursorStart === 0 && cursorEnd === 0

  if (command === 'backspace') {

    if (editor.editorProps.onDelete && editor.editorProps.onDelete(editorState) === false) {
      return 'handled'
    }

    const blockType = ContentUtils.getSelectionBlockType(editorState)

    if (allowIndent && cursorIsAtFirst && blockType !== 'code-block') {
      editor.setValue(ContentUtils.decreaseSelectionIndent(editorState))
    }

  }

  if (command === 'tab') {

    const blockType = ContentUtils.getSelectionBlockType(editorState)

    if (blockType === 'code-block') {
      editor.setValue(ContentUtils.insertText(editorState, ' '.repeat(editor.editorProps.codeTabIndents)))
      return 'handled'
    } else if (blockType !== 'atomic' && allowIndent && cursorIsAtFirst) {
      editor.setValue(ContentUtils.increaseSelectionIndent(editorState))
      return 'handled'
    }

  }

  const nextEditorState = ContentUtils.handleKeyCommand(editorState, command)

  if (nextEditorState) {
    editor.setValue(nextEditorState)
    return 'handled'
  }

  return 'not-handled'

}

export const returnHandlers = (event, editorState, editor) => {

  if (editor.editorProps.handleReturn && editor.editorProps.handleReturn(event, editorState) === 'handled') {
    return 'handled'
  }

  const currentBlock = ContentUtils.getSelectionBlock(editorState)
  const currentBlockType = currentBlock.getType()

  if (currentBlockType === 'unordered-list-item' || currentBlockType === 'ordered-list-item') {

    if (currentBlock.getLength() === 0) {
      editor.setValue(ContentUtils.toggleSelectionBlockType(editorState, 'unstyled'))
      return 'handled'
    }

    return 'not-handled'

  } else if (currentBlockType === 'code-block') {

    if (
      event.which === 13 && (
        event.getModifierState('Shift') ||
        event.getModifierState('Alt') ||
        event.getModifierState('Control')
      )) {
      editor.setValue(ContentUtils.toggleSelectionBlockType(editorState, 'unstyled'))
      return 'handled'
    }

    return 'not-handled'

  }

  const nextEditorState = ContentUtils.handleNewLine(editorState, event)

  if (nextEditorState) {
    editor.setValue(nextEditorState)
    return 'handled'
  }

  return 'not-handled'

}

export const beforeInputHandlers = (chars, editorState, editor) => {

  if (editor.editorProps.handleBeforeInput && editor.editorProps.handleBeforeInput(chars, editorState) === 'handled') {
    return 'handled'
  }

  return 'not-handled'

}

export const dropHandlers = (selectionState, dataTransfer, editor) => {

  if (window && window.__BRAFT_DRAGING__IMAGE__) {

    const editorState = ContentUtils.removeBlock(
      ContentUtils.insertMedias(editorState, [window.__BRAFT_DRAGING__IMAGE__.mediaData]),
      window.__BRAFT_DRAGING__IMAGE__.block, selectionState
    )

    window.__BRAFT_DRAGING__IMAGE__ = null

    editor.setDraftProps({ readOnly: false })
    editor.setValue(editorState)

    return 'handled'

  } else if (!dataTransfer || !dataTransfer.getText()) {
    return 'handled'
  }

  return 'not-handled'

}

export const handleFiles = (files, editor) => {

  const { pasteImage, imagePasteLimit } = { ...editor.constructor.defaultProps.media, ...editor.editorProps.media }

  pasteImage && files.slice(0, imagePasteLimit).forEach((file) => {
    file && file.type.indexOf('image') > -1 && editor.braftFinder.uploadImage(file, image => {
      editor.isLiving && editor.setValue(ContentUtils.insertMedias(editor.state.editorState, [image]))
    })
  })

  if (files[0] && files[0].type.indexOf('image') > -1 && pasteImage) {
    return 'handled'
  }

  return 'not-handled'
  
}

export const droppedFilesHandlers = (selectionState, files, editor) => {

  if (editor.editorProps.handleDroppedFiles && editor.editorProps.handleDroppedFiles(selectionState, files) === 'handled') {
    return 'handled'
  }

  return handleFiles(files, editor)

}

export const pastedFilesHandlers = (files, editor) => {

  if (editor.editorProps.handlePastedFiles && editor.editorProps.handlePastedFiles(files) === 'handled') {
    return 'handled'
  }

  return handleFiles(files, editor)

}

export const pastedTextHandlers = (text, html, editorState, editor) => {

  if (editor.editorProps.handlePastedText && editor.editorProps.handlePastedText(text, html, editorState) === 'handled') {
    return 'handled'
  }

  if (!html || editor.editorProps.stripPastedStyles) {
    return false
  }

  const tempColors = ColorUtils.detectColorsFromHTMLString(html)

  editor.setState({
    tempColors: [...editor.state.tempColors, ...tempColors].filter(item => editor.editorProps.colors.indexOf(item) === -1).filter((item, index, array) => array.indexOf(item) === index)
  }, () => {
    editor.setValue(ContentUtils.insertHTML(editorState, html, 'paste'))
  })

  return 'handled'

}
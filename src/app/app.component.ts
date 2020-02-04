import { Component, ViewChild, OnInit, ElementRef, AfterViewInit } from '@angular/core';

declare const WebViewer: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('viewer', { static: false }) viewer: ElementRef;
  wvInstance: any;

  ngAfterViewInit(): void {

    WebViewer({
      path: '../lib',
      initialDoc: '../files/webviewer-demo-annotated.pdf'
    }, this.viewer.nativeElement).then(instance => {
      this.wvInstance = instance;

      // now you can access APIs through this.webviewer.getInstance()
      instance.openElement('notesPanel');
      // see https://www.pdftron.com/documentation/web/guides/ui/apis for the full list of APIs

      // or listen to events from the viewer element
      this.viewer.nativeElement.addEventListener('pageChanged', (e) => {
        const [ pageNumber ] = e.detail;
        console.log(`Current page is ${pageNumber}`);
      });

      // or from the docViewer instance
      instance.docViewer.on('annotationsLoaded', () => {
        console.log('annotations loaded');
      });

      instance.docViewer.on('documentLoaded', this.wvDocumentLoadedHandler)

      // download annotations from server when document has finished loading
      // https://www.pdftron.com/documentation/web/guides/annotation/import-export/files/
      instance.docViewer.on('annotationsLoaded', () => {
        fetch('path/to/annotation/server', {
          method: 'GET'
        }).then(response => {
          if (response.status === 200) {
            response.text().then(xfdfString => {
              // <xfdf>
              //    <annots>
              //      <text subject="Comment" page="0" color="#FFE6A2" ... />
              //    </annots>
              // </xfdf>
              instance.annotManager.importAnnotations(xfdfString);
            });
          }
        });
      })

      // upload annotations to server after annotation is changed (added/modify/delete)
      // https://www.pdftron.com/documentation/web/guides/annotation-events#annotationchanged
      instance.annotManager.on('annotationChanged', function(annotations, action, { imported }) {
        if (imported) {
          return;
        }
        const annotOptions = {
          widgets: false,
          fields: false,
          links: false
        }
        instance.annotManager.exportAnnotations(annotOptions).then(xfdfString => {
          const formData = new FormData();
          formData.append('xfdf', new Blob([xfdfString], {type: "text/plain;charset=utf-8"}), /* filename */);
          fetch('path/to/annotation/server', {
            method: 'POST',
            body: formData // written into an XFDF record in server database
          });
        })
      })

    });
  }

  ngOnInit() {
    this.wvDocumentLoadedHandler = this.wvDocumentLoadedHandler.bind(this);
  }

  wvDocumentLoadedHandler(): void {
    // you can access docViewer object for low-level APIs
    const docViewer = this.wvInstance;
    const annotManager = this.wvInstance.annotManager;
    // and access classes defined in the WebViewer iframe
    const { Annotations } = this.wvInstance;
    const rectangle = new Annotations.RectangleAnnotation();
    rectangle.PageNumber = 1;
    rectangle.X = 100;
    rectangle.Y = 100;
    rectangle.Width = 250;
    rectangle.Height = 250;
    rectangle.StrokeThickness = 5;
    rectangle.Author = annotManager.getCurrentUser();
    annotManager.addAnnotation(rectangle);
    annotManager.drawAnnotations(rectangle.PageNumber);
    // see https://www.pdftron.com/api/web/WebViewer.html for the full list of low-level APIs
  }
}

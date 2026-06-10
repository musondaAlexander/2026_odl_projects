from django.urls import path

from .views import FileDeleteView, FileDownloadView, FileListView, FileUploadView

urlpatterns = [
    path("", FileListView.as_view(), name="file-list"),
    path("upload/", FileUploadView.as_view(), name="file-upload"),
    path("<uuid:pk>/download/", FileDownloadView.as_view(), name="file-download"),
    path("<uuid:pk>/", FileDeleteView.as_view(), name="file-delete"),
]

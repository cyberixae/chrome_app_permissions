.PHONY : clean

all:
	zip -r permission_viewer.zip permission_viewer

clean:
	-rm permission_viewer.zip
